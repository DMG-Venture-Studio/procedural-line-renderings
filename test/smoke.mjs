/* Headless smoke test. Generates every kind over several seeds with a stub canvas, checks the
   geometry, and simulates the bounce runner to confirm it reseeds. Run: node test/smoke.mjs */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rng } from '../src/random.js';
import { corner4 } from '../src/corner.js';
import { massing3 } from '../src/massing.js';
import { wfc } from '../src/wfc.js';
import { facade } from '../src/grammar.js';
import { facadePoint } from '../src/camera.js';
import { renderTo, totalLength, bounce, drawIn } from '../src/render.js';

const region = { x: 0, y: 0, w: 680, h: 700 };
const SEEDS = [1, 2, 3, 4, 5, 6];
let checks = 0;

/** Count strokes and fills, and fail on any non-finite coordinate or stroke left of the region. */
function inspect(name, items, min, max) {
  let strokes = 0, fills = 0, top = Infinity;
  for (const it of items) {
    fills += (it.fills || []).length;
    for (const s of it.strokes) {
      strokes++;
      for (const q of s) {
        assert.ok(Number.isFinite(q[0]) && Number.isFinite(q[1]), `${name}: non-finite coordinate`);
        assert.ok(q[0] >= region.x - 1, `${name}: stroke left of region`);
        top = Math.min(top, q[1]);
      }
    }
  }
  assert.ok(strokes >= min && strokes <= max, `${name}: ${strokes} strokes outside [${min}, ${max}]`);
  checks++;
  return { strokes, fills, top: Math.round(top) };
}

const kinds = {
  'corner': (r) => corner4(r, region, {}),
  'corner pitch': (r) => corner4(r, region, { pitch: true }),
  'corner full': (r) => corner4(r, region, { full: true }),
  'massing': (r) => massing3(r, region, { terraces: true, towers: true, hatchlight: true }),
  'massing plain': (r) => massing3(r, region, {})
};
const ranges = { 'corner': [800, 4000], 'corner pitch': [800, 4000], 'corner full': [2000, 12000], 'massing': [400, 2000], 'massing plain': [200, 1500] };
for (const [name, build] of Object.entries(kinds)) {
  const rows = SEEDS.map(seed => { const t0 = Date.now(); const r = inspect(name, build(rng(seed)), ...ranges[name]); return `${r.strokes}s/${r.fills}f top=${r.top} ${Date.now() - t0}ms`; });
  console.log(name.padEnd(14), rows.join(' | '));
}

// Determinism: same seed, same drawing.
assert.deepEqual(corner4(rng(42), region, {}), corner4(rng(42), region, {}), 'corner is not deterministic');
assert.deepEqual(massing3(rng(42), region, { terraces: true }), massing3(rng(42), region, { terraces: true }), 'massing is not deterministic');
checks += 2;

// The plain facade grammar and the WFC solver still work on their own.
const proj = (d, h) => facadePoint(d, h, 900, 200, 600, 300, 38, 6);
assert.ok(facade(rng(3), proj, { width: 14, floors: 4, floorH: 3, groundH: 4, bayW: 3 }).length > 40, 'facade too sparse');
const tiles = [{ sockets: { T: 'a', R: 'a', B: 'a', L: 'a' }, weight: 1 }, { sockets: { T: 'a', R: 'b', B: 'a', L: 'b' }, weight: 1 }];
const grid = wfc(rng(1), tiles, 8, 4, { T: 'a', B: 'a', L: 'a', R: 'a' }, 10);
assert.ok(grid && grid.length === 32, 'wfc failed to solve a trivial grid');
checks += 2;

// Rendering with a stub canvas: fills come out before strokes, and the whole drawing is drawn.
const calls = [];
const ctx = new Proxy({ canvas: { width: 680, height: 700 } }, { get: (o, k) => (k in o ? o[k] : (...a) => { calls.push(k); }), set: () => true });
const items = corner4(rng(9), region, {});
renderTo(ctx, items, totalLength(items) + 1, {});
assert.ok(calls.filter(c => c === 'fill').length === items.reduce((n, it) => n + (it.fills || []).length, 0), 'renderTo skipped fills');
assert.ok(calls.filter(c => c === 'lineTo').length >= items.reduce((n, it) => n + it.strokes.length, 0), 'renderTo skipped strokes');
checks++;

// Bounce: simulate frames; a full in/hold/out/hold cycle must call onEmpty and swap the drawing.
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

// drawIn: finishes and stops requesting frames.
frames.length = 0;
drawIn(ctx, items, { pxPerSecond: totalLength(items) });
let n = 0; t = 0;
while (frames.length && n < 500) { const f = frames.shift(); t += 100; f(t); n++; }
assert.ok(n < 500 && frames.length === 0, 'drawIn never finished');
checks++;

// Reduced motion: renders once, requests no frames.
globalThis.window.matchMedia = () => ({ matches: true });
frames.length = 0;
bounce(ctx, items, {});
assert.equal(frames.length, 0, 'bounce animated under reduced motion');
checks++;

// The dist build evaluates and exposes the same API.
const dist = readFileSync(new URL('../dist/procedural-line-renderings.js', import.meta.url), 'utf8');
const sandbox = {};
new Function('window', dist)(sandbox);
assert.ok(sandbox.ProceduralLines && typeof sandbox.ProceduralLines.corner4 === 'function' && typeof sandbox.ProceduralLines.bounce === 'function', 'dist API missing');
assert.deepEqual(sandbox.ProceduralLines.corner4(sandbox.ProceduralLines.rng(42), region, {}), corner4(rng(42), region, {}), 'dist drawing differs from src');
checks++;

console.log(`ok: ${checks} checks passed`);
