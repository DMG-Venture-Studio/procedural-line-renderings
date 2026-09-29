/* The Wave Function Collapse skyline: socketed tiles collapsed into a consistent street of buildings. */
import { wfc } from './wfc.js';
import { resolve } from './options.js';

/** A stroke from (a, b) to (c, d). */
function L(a, b, c, d) { return [[a, b], [c, d]]; }

/** The tile alphabet: sky, street, roof, wall interiors, door, plinth, each in four edge variants. */
function tileSet(F) {
  var kinds = [
    { k: 'sky', T: 'sky', B: 'sky', w: 6 },
    { k: 'roof', T: 'sky', B: 'wall', w: 2 },
    { k: 'blank', T: 'wall', B: 'wall', w: 1.5 },
    { k: 'plinth', T: 'wall', B: 'ground', w: 2 }
  ];
  if (F.streets) kinds.push({ k: 'street', T: 'sky', B: 'ground', w: 2 });
  if (F.windows) kinds.push({ k: 'window', T: 'wall', B: 'wall', w: 5 });
  if (F.bands) kinds.push({ k: 'band', T: 'wall', B: 'wall', w: 0.7 });
  if (F.doors) kinds.push({ k: 'door', T: 'wall', B: 'ground', w: 1 });
  var tiles = [];
  kinds.forEach(function (kd) {
    var sides = (kd.k === 'sky' || kd.k === 'street') ? [['sky', 'sky']] : [['sky', 'sky'], ['sky', 'wall'], ['wall', 'sky'], ['wall', 'wall']];
    sides.forEach(function (s) { tiles.push({ k: kd.k, sockets: { T: kd.T, R: s[1], B: kd.B, L: s[0] }, weight: kd.w * (s[0] === s[1] && s[0] === 'wall' ? 2 : 1) }); });
  });
  return tiles;
}

/** Draw the interior of one solid tile. Returns {strokes, glows}. */
function interior(t, px, py, cell) {
  var m = cell * 0.22, s = [], glows = [];
  if (t.k === 'window') {
    s.push(L(px + m, py + m, px + cell - m, py + m), L(px + cell - m, py + m, px + cell - m, py + cell - m), L(px + cell - m, py + cell - m, px + m, py + cell - m), L(px + m, py + cell - m, px + m, py + m));
    glows.push([[px + m, py + m], [px + cell - m, py + m], [px + cell - m, py + cell - m], [px + m, py + cell - m]]);
  }
  if (t.k === 'door') s.push(L(px + m, py + cell, px + m, py + m * 0.6), L(px + m, py + m * 0.6, px + cell - m, py + m * 0.6), L(px + cell - m, py + m * 0.6, px + cell - m, py + cell));
  if (t.k === 'band') s.push(L(px, py + cell * 0.5, px + cell, py + cell * 0.5));
  return { strokes: s, glows: glows };
}

/** The skyline. r: generator. R: region. opts: see SKYLINE_OPTIONS. Returns items. */
export function skyline(r, R, opts) {
  var F = resolve('skyline', opts), tiles = tileSet(F);
  var rows = 14, cell = Math.max(6, Math.floor(R.h * 0.78 / rows)), cols = Math.ceil(R.w / cell) + 1;
  var grid = wfc(r, tiles, cols, rows, { T: 'sky', B: 'ground', L: 'sky', R: 'sky' }, 30);
  var gl = R.y + R.h * 0.86;
  if (!grid) return [{ strokes: [L(R.x, gl, R.x + R.w, gl)] }];
  var x0 = R.x, y0 = gl - rows * cell, items = [], edges = [];
  function tile(x, y) { return (x < 0 || y < 0 || x >= cols || y >= rows) ? null : tiles[grid[y * cols + x]]; }
  function solid(t) { return t && t.k !== 'sky' && t.k !== 'street'; }
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
    var t = tile(x, y); if (!solid(t)) continue;
    var px = x0 + x * cell, py = y0 + y * cell;
    if (!solid(tile(x - 1, y))) edges.push(L(px, py, px, py + cell));
    if (!solid(tile(x + 1, y))) edges.push(L(px + cell, py, px + cell, py + cell));
    if (!solid(tile(x, y - 1))) { edges.push(L(px, py, px + cell, py)); if (F.cornices) edges.push(L(px, py + 4, px + cell, py + 4)); }
    var it = interior(t, px, py, cell);
    if (it.strokes.length) items.push({ strokes: it.strokes, glows: it.glows.map(function (p) { return { poly: p, k: r() }; }) });
  }
  items.unshift({ strokes: edges });
  items.push({ strokes: [L(R.x, gl, R.x + R.w, gl)] });
  return items;
}
