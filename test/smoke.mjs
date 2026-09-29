/* Headless smoke test. Generates every kind with defaults, every flag on, and every flag off, in
   every perspective, over several seeds with a stub canvas; checks geometry; proves each flag and
   each perspective changes the drawing; checks presets, the plan has no glow, the corner rejects
   perspective 1; simulates the bounce runner to confirm it reseeds. Run: node test/smoke.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rng } from '../src/random.js';
import { corner4 } from '../src/corner.js';
import { massing3 } from '../src/massing.js';
import { skyline } from '../src/skyline.js';
import { plan } from '../src/plan.js';
import { wfc } from '../src/wfc.js';
import { facade } from '../src/grammar.js';
import { facadePoint, fitSimilarity } from '../src/camera.js';
import { OPTIONS, PARAMS, PRESETS, GLOW_KINDS, defaults, resolve } from '../src/options.js';
import { renderTo, totalLength, bounce, drawIn } from '../src/render.js';

const region = { x: 0, y: 0, w: 680, h: 700 };
const wide = { x: 0, y: 0, w: 1440, h: 720 };
const SEEDS = [1, 2, 3, 4, 5, 6];
const GEN = { corner: corner4, massing: massing3, skyline: skyline, plan: plan };
let checks = 0;

/** Count strokes, fills and glows; fail on any non-finite coordinate or stroke left of the region. */
function inspect(name, items, R) {
  R = R || region;
  let strokes = 0, fills = 0, glows = 0;
  for (const it of items) {
    fills += (it.fills || []).length; glows += (it.glows || []).length;
    for (const g of it.glows || []) for (const q of g.poly) assert.ok(Number.isFinite(q[0]) && Number.isFinite(q[1]), `${name}: non-finite glow`);
    for (const s of it.strokes) {
      strokes++;
      for (const q of s) {
        assert.ok(Number.isFinite(q[0]) && Number.isFinite(q[1]), `${name}: non-finite coordinate`);
        assert.ok(q[0] >= R.x - 1, `${name}: stroke left of region`);
      }
    }
  }
  checks++;
  return { strokes, fills, glows };
}

/** Every flag set to v, params at their defaults. */
function allFlags(kind, v) { const o = defaults(kind); for (const f of OPTIONS[kind]) o[f.name] = v; return o; }

/** Stroke count of one generator at one seed with the given options. */
function count(kind, seed, opts, R) { return inspect(`${kind}@${seed}`, GEN[kind](rng(seed), R || region, opts), R).strokes; }

/** The perspective param of a kind, or null. */
function persp(kind) { return (PARAMS[kind] || []).find(p => p.name === 'perspective') || null; }

// 1. Every generator with defaults, all on, all off, in every perspective, over six seeds.
const floor = { corner: 300, massing: 150, skyline: 300, plan: 20 };
for (const kind of Object.keys(GEN)) {
  const modes = persp(kind) ? persp(kind).values : [null];
  for (const mode of modes) {
    const rows = [];
    for (const [label, opts] of [['defaults', defaults(kind)], ['all on', allFlags(kind, true)], ['all off', allFlags(kind, false)]]) {
      if (mode !== null) opts.perspective = mode;
      const ns = SEEDS.map(seed => count(kind, seed, opts));
      assert.ok(Math.min(...ns) >= floor[kind], `${kind} p${mode} ${label}: too few strokes (${Math.min(...ns)})`);
      rows.push(`${label} ${Math.min(...ns)}-${Math.max(...ns)}`);
    }
    console.log((kind + (mode !== null ? ' p' + mode : '')).padEnd(11), rows.join(' | '));
  }
}

// 2. Every flag changes the stroke count for at least one seed when toggled from the defaults.
for (const kind of Object.keys(GEN)) {
  const base = SEEDS.map(seed => count(kind, seed, defaults(kind)));
  const inert = [];
  for (const f of OPTIONS[kind]) {
    const toggled = Object.assign(defaults(kind), { [f.name]: !f.def });
    const changed = SEEDS.some((seed, i) => count(kind, seed, toggled) !== base[i]);
    if (!changed) inert.push(f.name);
  }
  assert.deepEqual(inert, [], `${kind}: flags with no effect: ${inert.join(', ')}`);
  checks++;
  console.log(`${kind}: ${OPTIONS[kind].length} flags, each changes the drawing`);
}

// 3. Every perspective value produces a different drawing from the default one; unsupported
//    values fall back to the default (the corner has no one-point mode).
for (const kind of Object.keys(GEN)) {
  const p = persp(kind); if (!p) continue;
  const base = GEN[kind](rng(7), region, defaults(kind));
  for (const v of p.values) {
    if (v === p.def) continue;
    assert.notDeepEqual(GEN[kind](rng(7), region, Object.assign(defaults(kind), { perspective: v })), base, `${kind}: perspective ${v} draws the same as ${p.def}`);
  }
  checks++;
}
{
  const warned = [];
  const orig = console.warn; console.warn = m => warned.push(m);
  const fallback = corner4(rng(7), region, { perspective: 1 });
  console.warn = orig;
  assert.deepEqual(fallback, corner4(rng(7), region, { perspective: 2 }), 'corner perspective 1 did not fall back to 2');
  assert.ok(warned.length === 1 && /perspective 1/.test(warned[0]), 'corner perspective 1 did not warn once');
  assert.equal(resolve('massing', { perspective: 1 }).perspective, 0, 'massing perspective 1 did not fall back');
  checks += 2;
}

// 4. Presets apply and add to the drawing; the ink preset turns on every ink flag.
{
  const ink = corner4(rng(5), region, { preset: 'ink' }), plain = corner4(rng(5), region, {});
  assert.ok(inspect('ink', ink).strokes > inspect('plain', plain).strokes * 2, 'ink preset is not markedly richer');
  for (const f of OPTIONS.corner.filter(f => f.family === 'ink')) assert.equal(PRESETS.corner.ink[f.name], true, `ink preset lacks ${f.name}`);
  assert.deepEqual(corner4(rng(5), region, { preset: 'ink' }), corner4(rng(5), region, Object.assign({}, PRESETS.corner.ink)), 'preset differs from its expanded flags');
  checks += 2;
}

// 5. Glow polygons exist where windows do and nowhere else; the plan never glows.
assert.ok(count('corner', 1, { full: true }) > count('corner', 1, {}), 'full recipe is not bigger');
assert.ok(inspect('corner glows', corner4(rng(2), region, {})).glows > 20, 'corner has no window polygons for glow');
assert.ok(inspect('bay glows', corner4(rng(2), region, { bays: true, towers: false })).glows > 20, 'bay windows have no glow polygons');
assert.ok(inspect('massing openings', massing3(rng(2), region, { openings: true })).glows > 20, 'massing openings have no glow polygons');
for (const v of [1, 2, 3]) assert.ok(inspect('skyline glows', skyline(rng(2), region, { perspective: v })).glows > 20, `skyline p${v} has no glow polygons`);
assert.equal(inspect('plan glows', plan(rng(2), region, {})).glows, 0, 'plan emits glow polygons');
assert.equal(GLOW_KINDS.plan, false, 'plan is marked as glowing');
checks += 3;

// 6. Skyline stroke counts at the desktop preset, per perspective, land in the target band.
for (const v of [1, 2, 3]) {
  const ns = [1, 2, 3].map(seed => count('skyline', seed, Object.assign(defaults('skyline'), { perspective: v }), wide));
  assert.ok(Math.min(...ns) >= 3000 && Math.max(...ns) <= 8000, `skyline p${v} at 1440x720 outside 3000..8000: ${ns.join(', ')}`);
  console.log(`skyline p${v} at 1440x720: ${ns.join(', ')} strokes`);
}
checks++;

// 7. Determinism: same seed, same drawing.
for (const kind of Object.keys(GEN)) assert.deepEqual(GEN[kind](rng(42), region, allFlags(kind, true)), GEN[kind](rng(42), region, allFlags(kind, true)), `${kind} is not deterministic`);
checks++;

// 8. The plain facade grammar, the WFC solver, and the similarity fit still work on their own.
const proj = (d, h) => facadePoint(d, h, 900, 200, 600, 300, 38, 6);
assert.ok(facade(rng(3), proj, { width: 14, floors: 4, floorH: 3, groundH: 4, bayW: 3 }).length > 40, 'facade too sparse');
const tiles = [{ sockets: { T: 'a', R: 'a', B: 'a', L: 'a' }, weight: 1 }, { sockets: { T: 'a', R: 'b', B: 'a', L: 'b' }, weight: 1 }];
assert.ok(wfc(rng(1), tiles, 8, 4, { T: 'a', B: 'a', L: 'a', R: 'a' }, 10).length === 32, 'wfc failed on a trivial grid');
{
  const fitted = fitSimilarity([{ strokes: [[[0, 0], [10, 5]], [[10, 5], [0, 5]]] }], { x: 0, y: 0, w: 200, h: 100 }, {});
  const xs = fitted[0].strokes.flat().map(q => q[0]), ys = fitted[0].strokes.flat().map(q => q[1]);
  assert.ok(Math.min(...xs) >= 0 && Math.max(...xs) <= 200 && Math.min(...ys) >= 0 && Math.max(...ys) <= 100, 'similarity fit left the box');
  const ratio = (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
  assert.ok(Math.abs(ratio - 2) < 1e-9, 'similarity fit changed the aspect ratio');
}
checks += 3;

// 9. Rendering with a stub canvas: fills and glows come out, and the whole drawing is drawn.
const calls = [];
const ctx = new Proxy({ canvas: { width: 680, height: 700 } }, { get: (o, k) => (k in o ? o[k] : (...a) => { calls.push(k); }), set: () => true });
const items = corner4(rng(9), region, {});
renderTo(ctx, items, totalLength(items) + 1, { glow: '#F2D08A', glowProb: 1 });
const fillCalls = calls.filter(c => c === 'fill').length, expected = items.reduce((n, it) => n + (it.fills || []).length + (it.glows || []).length, 0);
assert.equal(fillCalls, expected, `renderTo fills ${fillCalls}, expected ${expected} (fills plus glows)`);
assert.ok(calls.filter(c => c === 'lineTo').length >= items.reduce((n, it) => n + it.strokes.length, 0), 'renderTo skipped strokes');
calls.length = 0;
renderTo(ctx, items, totalLength(items) + 1, {});
assert.equal(calls.filter(c => c === 'fill').length, items.reduce((n, it) => n + (it.fills || []).length, 0), 'glows drawn without a glow colour');
checks += 2;

// 10. Bounce: a full in/hold/out/hold cycle must call onEmpty and swap the drawing.
globalThis.window = { matchMedia: () => ({ matches: false }) };
const frames = [];
globalThis.requestAnimationFrame = f => frames.push(f);
let reseeds = 0;
const stop = bounce(ctx, items, { pxPerSecond: totalLength(items) / 7, pxPerSecondOut: totalLength(items) / 4, holdFull: 5000, holdEmpty: 700, onEmpty: () => { reseeds++; return { items: corner4(rng(10), region, {}) }; } });
let t = 0;
for (let i = 0; i < 1500 && frames.length; i++) { const f = frames.shift(); t += 16; f(t); }
assert.ok(reseeds >= 2, `bounce reseeded ${reseeds} times in ${t / 1000}s, expected at least 2`);
stop();
console.log(`bounce: ${reseeds} reseeds over ${(t / 1000).toFixed(1)} simulated seconds`);
checks++;

// 11. drawIn finishes; reduced motion requests no frames.
frames.length = 0;
drawIn(ctx, items, { pxPerSecond: totalLength(items) });
let n = 0; t = 0;
while (frames.length && n < 500) { const f = frames.shift(); t += 100; f(t); n++; }
assert.ok(n < 500 && frames.length === 0, 'drawIn never finished');
globalThis.window.matchMedia = () => ({ matches: true });
frames.length = 0;
bounce(ctx, items, {});
assert.equal(frames.length, 0, 'bounce animated under reduced motion');
checks += 2;

// 12. The dist build evaluates, exposes the same API, and draws the same geometry.
const dist = readFileSync(new URL('../dist/procedural-line-renderings.js', import.meta.url), 'utf8');
const sandbox = {};
new Function('window', dist)(sandbox);
const P = sandbox.ProceduralLines;
for (const kind of Object.keys(GEN)) {
  const name = kind === 'corner' ? 'corner4' : kind === 'massing' ? 'massing3' : kind;
  assert.ok(typeof P[name] === 'function', `dist lacks ${kind}`);
  assert.deepEqual(P[name](P.rng(42), region, allFlags(kind, true)), GEN[kind](rng(42), region, allFlags(kind, true)), `dist ${kind} differs from src`);
}
assert.ok(P.OPTIONS && P.PARAMS && P.PRESETS && P.GLOW_KINDS && P.snippetFor && P.TAGS, 'dist lacks options, params, presets or snippet helpers');
assert.ok(!P.truss && !P.TRUSS_OPTIONS && !P.TAGS.truss, 'dist still carries the truss');
checks++;

console.log(`ok: ${checks} checks passed`);
