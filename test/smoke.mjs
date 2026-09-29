/* Headless smoke test. Generates every kind with defaults, every flag on, and every flag off over
   several seeds with a stub canvas; checks geometry; proves each flag changes the drawing;
   simulates the bounce runner to confirm it reseeds. Run: node test/smoke.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rng } from '../src/random.js';
import { corner4 } from '../src/corner.js';
import { massing3 } from '../src/massing.js';
import { skyline } from '../src/skyline.js';
import { truss } from '../src/truss.js';
import { plan } from '../src/plan.js';
import { wfc } from '../src/wfc.js';
import { facade } from '../src/grammar.js';
import { facadePoint } from '../src/camera.js';
import { OPTIONS, defaults } from '../src/options.js';
import { renderTo, totalLength, bounce, drawIn } from '../src/render.js';

const region = { x: 0, y: 0, w: 680, h: 700 };
const SEEDS = [1, 2, 3, 4, 5, 6];
const GEN = { corner: corner4, massing: massing3, skyline: skyline, truss: truss, plan: plan };
let checks = 0;

/** Count strokes, fills and glows; fail on any non-finite coordinate or stroke left of the region. */
function inspect(name, items) {
  let strokes = 0, fills = 0, glows = 0;
  for (const it of items) {
    fills += (it.fills || []).length; glows += (it.glows || []).length;
    for (const g of it.glows || []) for (const q of g.poly) assert.ok(Number.isFinite(q[0]) && Number.isFinite(q[1]), `${name}: non-finite glow`);
    for (const s of it.strokes) {
      strokes++;
      for (const q of s) {
        assert.ok(Number.isFinite(q[0]) && Number.isFinite(q[1]), `${name}: non-finite coordinate`);
        assert.ok(q[0] >= region.x - 1, `${name}: stroke left of region`);
      }
    }
  }
  checks++;
  return { strokes, fills, glows };
}

/** Every flag set to v. */
function allFlags(kind, v) { const o = {}; for (const f of OPTIONS[kind]) o[f.name] = v; return o; }

/** Stroke count of one generator at one seed with the given options. */
function count(kind, seed, opts) { return inspect(`${kind}@${seed}`, GEN[kind](rng(seed), region, opts)).strokes; }

// 1. Every generator with defaults, all on, all off, over six seeds.
const floor = { corner: 300, massing: 150, skyline: 40, truss: 15, plan: 20 };
for (const kind of Object.keys(GEN)) {
  const rows = [];
  for (const [label, opts] of [['defaults', defaults(kind)], ['all on', allFlags(kind, true)], ['all off', allFlags(kind, false)]]) {
    const ns = SEEDS.map(seed => count(kind, seed, opts));
    assert.ok(Math.min(...ns) >= floor[kind], `${kind} ${label}: too few strokes (${Math.min(...ns)})`);
    rows.push(`${label} ${Math.min(...ns)}-${Math.max(...ns)}`);
  }
  console.log(kind.padEnd(8), rows.join(' | '));
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

// 3. Legacy shorthands still work and glows exist where windows do.
assert.ok(count('corner', 1, { full: true }) > count('corner', 1, {}), 'full recipe is not bigger');
const glowy = inspect('corner glows', corner4(rng(2), region, {}));
assert.ok(glowy.glows > 20, 'corner has no window polygons for glow');
assert.ok(inspect('massing openings', massing3(rng(2), region, { openings: true })).glows > 20, 'massing openings have no glow polygons');
assert.ok(inspect('skyline glows', skyline(rng(2), region, {})).glows > 5, 'skyline has no glow polygons');
checks += 2;

// 4. Determinism: same seed, same drawing.
for (const kind of Object.keys(GEN)) assert.deepEqual(GEN[kind](rng(42), region, allFlags(kind, true)), GEN[kind](rng(42), region, allFlags(kind, true)), `${kind} is not deterministic`);
checks++;

// 5. The plain facade grammar and the WFC solver still work on their own.
const proj = (d, h) => facadePoint(d, h, 900, 200, 600, 300, 38, 6);
assert.ok(facade(rng(3), proj, { width: 14, floors: 4, floorH: 3, groundH: 4, bayW: 3 }).length > 40, 'facade too sparse');
const tiles = [{ sockets: { T: 'a', R: 'a', B: 'a', L: 'a' }, weight: 1 }, { sockets: { T: 'a', R: 'b', B: 'a', L: 'b' }, weight: 1 }];
assert.ok(wfc(rng(1), tiles, 8, 4, { T: 'a', B: 'a', L: 'a', R: 'a' }, 10).length === 32, 'wfc failed on a trivial grid');
checks += 2;

// 6. Rendering with a stub canvas: fills and glows come out, and the whole drawing is drawn.
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

// 7. Bounce: a full in/hold/out/hold cycle must call onEmpty and swap the drawing.
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

// 8. drawIn finishes; reduced motion requests no frames.
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

// 9. The dist build evaluates, exposes the same API, and draws the same geometry.
const dist = readFileSync(new URL('../dist/procedural-line-renderings.js', import.meta.url), 'utf8');
const sandbox = {};
new Function('window', dist)(sandbox);
const P = sandbox.ProceduralLines;
for (const kind of Object.keys(GEN)) {
  assert.ok(typeof P[kind === 'corner' ? 'corner4' : kind === 'massing' ? 'massing3' : kind] === 'function', `dist lacks ${kind}`);
  const fn = P[kind === 'corner' ? 'corner4' : kind === 'massing' ? 'massing3' : kind];
  assert.deepEqual(fn(P.rng(42), region, allFlags(kind, true)), GEN[kind](rng(42), region, allFlags(kind, true)), `dist ${kind} differs from src`);
}
assert.ok(P.OPTIONS && P.snippetFor && P.TAGS, 'dist lacks options or snippet helpers');
checks++;

console.log(`ok: ${checks} checks passed`);
