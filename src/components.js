/* Web Components: <dmg-street-corner>, <dmg-massing>, <dmg-skyline>, <dmg-truss>, <dmg-plan>.
   Each element owns a canvas sized to its own box at device pixel ratio and draws the chosen
   generator into it. The page decides placement and size through CSS. Feature flags arrive as
   JSON in the `options` attribute and are validated against src/options.js. */
import { rng, clockSeed } from './random.js';
import { corner4 } from './corner.js';
import { massing3 } from './massing.js';
import { skyline } from './skyline.js';
import { truss } from './truss.js';
import { plan } from './plan.js';
import { resolve, diffFromDefaults } from './options.js';
import { bounce, drawIn, speedsFor } from './render.js';

var STYLE = ':host{display:block;position:relative;min-height:240px}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}';

/** Night palette and glow defaults. */
export var NIGHT = { page: '#0E0E10', color: '#A8AAB0', glow: '#F2D08A', glowProb: 0.6 };
var DAY = { page: '#FFFFFF', color: '#C4C6CB', glowProb: 0.35 };

/** Generators by element kind. Each takes (r, region, options) and returns items. */
var GENERATORS = { corner: corner4, massing: massing3, skyline: skyline, truss: truss, plan: plan };

/** Tag names by kind. */
export var TAGS = { corner: 'dmg-street-corner', massing: 'dmg-massing', skyline: 'dmg-skyline', truss: 'dmg-truss', plan: 'dmg-plan' };

/** Parse the options attribute (JSON) plus the boolean shorthands pitch and full into flags. */
function readOptions(el, kind) {
  var raw = el.getAttribute('options'), parsed = {};
  if (raw) { try { parsed = JSON.parse(raw) || {}; } catch (e) { parsed = {}; } }
  if (kind === 'corner') {
    if (el.hasAttribute('pitch')) parsed.pitch = true;
    if (el.hasAttribute('full')) { parsed.backRow = true; parsed.balconies = true; parsed.awnings = true; parsed.setbacks = true; parsed.closeCamera = true; }
  }
  return resolve(kind, parsed);
}

/** Read the element's attributes into a plain object with defaults, night mode applied. */
function readAttrs(el, kind) {
  var seed = el.getAttribute('seed'), night = el.hasAttribute('night'), base = night ? NIGHT : DAY;
  var glow = el.getAttribute('glow');
  return {
    seed: seed === null || seed === '' ? null : Number(seed) >>> 0,
    reseed: el.getAttribute('reseed') || 'cycle',
    mode: el.getAttribute('mode') || 'bounce',
    color: el.getAttribute('color') || base.color,
    page: el.getAttribute('page') || base.page,
    glow: glow != null && glow !== '' ? glow : (night ? NIGHT.glow : null),
    glowProb: base.glowProb,
    night: night,
    options: readOptions(el, kind)
  };
}

/** Size the canvas to the element at device resolution. Returns {ctx, region} or null when unsized. */
function fitCanvas(el, canvas) {
  var w = el.clientWidth, h = el.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
  if (!w || !h) return null;
  canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
  var ctx = canvas.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
  return { ctx: ctx, region: { x: 0, y: 0, w: w, h: h } };
}

/** The HTML that reproduces an element's current state, with only non-default options. */
export function snippetFor(el, kind) {
  var a = readAttrs(el, kind), parts = ['<' + TAGS[kind]];
  if (a.seed != null) parts.push('seed="' + a.seed + '"');
  if (a.mode !== 'bounce') parts.push('mode="' + a.mode + '"');
  if (a.reseed !== 'cycle') parts.push('reseed="' + a.reseed + '"');
  if (a.night) parts.push('night');
  if (el.getAttribute('color')) parts.push('color="' + el.getAttribute('color') + '"');
  if (el.getAttribute('page')) parts.push('page="' + el.getAttribute('page') + '"');
  if (el.getAttribute('glow')) parts.push('glow="' + el.getAttribute('glow') + '"');
  var diff = diffFromDefaults(kind, a.options);
  if (Object.keys(diff).length) parts.push("options='" + JSON.stringify(diff) + "'");
  var style = el.getAttribute('style');
  if (style) parts.push('style="' + style + '"');
  return parts.join(' ') + '></' + TAGS[kind] + '>';
}

/** Build the element class for one generator kind. Defined lazily so the module loads without a DOM. */
function makeClass(kind) {
  return class extends HTMLElement {
    static get observedAttributes() { return ['seed', 'reseed', 'mode', 'pitch', 'full', 'color', 'page', 'glow', 'night', 'options']; }

    constructor() {
      super();
      this._stop = null; this._seed = null; this._canvas = null; this._ro = null;
    }

    /** The seed of the drawing currently shown. Setting it redraws with that seed. */
    get seed() { return this._seed; }
    set seed(v) { this.setAttribute('seed', String(v >>> 0)); }

    /** The resolved feature flags in effect. */
    get options() { return readOptions(this, kind); }

    /** The HTML that reproduces this element's current state. */
    get snippet() { return snippetFor(this, kind); }

    connectedCallback() {
      if (!this.shadowRoot) {
        var root = this.attachShadow({ mode: 'open' }), style = document.createElement('style');
        style.textContent = STYLE; root.appendChild(style);
        this._canvas = document.createElement('canvas'); this._canvas.setAttribute('aria-hidden', 'true'); root.appendChild(this._canvas);
      }
      var self = this;
      if (typeof ResizeObserver !== 'undefined') { this._ro = new ResizeObserver(function () { self._start(); }); this._ro.observe(this); }
      else this._start();
    }

    disconnectedCallback() { this.stop(); if (this._ro) { this._ro.disconnect(); this._ro = null; } }

    attributeChangedCallback() { if (this.isConnected && this._canvas) this._start(); }

    /** Stop the animation. The last frame stays on the canvas. */
    stop() { if (this._stop) { this._stop(); this._stop = null; } }

    /** Draw a new sibling from a fresh clock seed, regardless of the seed attribute. */
    regenerate() { this._start(clockSeed(kind)); }

    /** One drawing at the given seed (or the attribute, or the clock), with its plotting speeds. */
    _fresh(region, attrs, forced) {
      var seed = forced != null ? forced : (attrs.seed != null ? attrs.seed : clockSeed(kind));
      this._seed = seed;
      this.dispatchEvent(new CustomEvent('seed', { detail: { seed: seed } }));
      var items = GENERATORS[kind](rng(seed), region, attrs.options), sp = speedsFor(items, 7, 4);
      return { items: items, pxPerSecond: sp.pxPerSecond, pxPerSecondOut: sp.pxPerSecondOut };
    }

    /** (Re)start drawing into the canvas at the element's current size. */
    _start(forcedSeed) {
      this.stop();
      var s = fitCanvas(this, this._canvas); if (!s) return;
      var attrs = readAttrs(this, kind), self = this, first = this._fresh(s.region, attrs, forcedSeed);
      var opts = { color: attrs.color, page: attrs.page, glow: attrs.glow, glowProb: attrs.glowProb, pxPerSecond: first.pxPerSecond, pxPerSecondOut: first.pxPerSecondOut, holdFull: 5000, holdEmpty: 700 };
      if (attrs.mode === 'once') { this._stop = drawIn(s.ctx, first.items, opts); return; }
      if (attrs.reseed === 'cycle' && attrs.seed == null) opts.onEmpty = function () { return self._fresh(s.region, attrs); };
      this._stop = bounce(s.ctx, first.items, opts);
    }
  };
}

/** Register every element. Safe to call more than once and outside a browser (no-op). */
export function defineComponents() {
  if (typeof customElements === 'undefined' || typeof HTMLElement === 'undefined') return false;
  Object.keys(TAGS).forEach(function (kind) { if (!customElements.get(TAGS[kind])) customElements.define(TAGS[kind], makeClass(kind)); });
  return true;
}
