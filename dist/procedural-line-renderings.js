/* @dmg-venture-studio/procedural-line-renderings, assembled by build.mjs. Vanilla JS, no dependencies. */
(function (global) {
'use strict';
/* ---- random.js ---- */
/* Seeded randomness. Every drawing is a pure function of its seed. */

/** Mulberry32 generator. Same seed, same sequence, same drawing. */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string to a 32-bit seed. Feed it the clock for a per-visit drawing. */
function hashSeed(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** A seed derived from the current clock and a label, so sibling elements differ. */
function clockSeed(label) {
  return hashSeed(String(Date.now()) + (label || ''));
}

/** Pick one element of an array with the given generator. */
function pick(r, arr) {
  return arr[Math.floor(r() * arr.length)];
}

/* ---- camera.js ---- */
/* Projections: axonometric, facade-plane two-point, and a pinhole camera. */

/** Axonometric projection. ox, oy: screen origin. u: px per unit. deg: axis angle (30 = isometric). */
function makeIso(ox, oy, u, deg) {
  var a = (deg || 30) * Math.PI / 180, C = Math.cos(a), S = Math.sin(a);
  return function (x, y, z) { return [ox + (x - y) * C * u, oy + (x + y) * S * u - z * u]; };
}

/** Two-point perspective for a point on a vertical facade plane.
    d: distance along the facade from the corner. h: height. vpx: vanishing point x.
    cx, groundY: the corner on screen. hy: horizon y. D0: recession rate. scale: px per unit at the corner. */
function facadePoint(d, h, vpx, cx, groundY, hy, D0, scale) {
  var t = d / (d + D0);
  var x = cx + (vpx - cx) * t;
  var yc = groundY - h * scale;
  return [x, hy + (yc - hy) * (1 - t)];
}

function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/** Pinhole camera with unit focal length. C: camera position. T: aim point (same height as C for
    two-point). pitch: upward tilt, 0 for two-point, > 0 for three-point with converging verticals.
    Returns a function from world [x, y, z] to screen [x, y]; fit the result with a 2D similarity. */
function pinhole(C, T, pitch) {
  var f = norm([T[0] - C[0], T[1] - C[1], (pitch || 0) * 20]);
  var rt = norm(cross(f, [0, 0, 1])), up = cross(rt, f);
  return function (P) {
    var v = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], z = Math.max(0.05, dot(v, f));
    return [dot(v, rt) / z, -dot(v, up) / z];
  };
}

/* ---- options.js ---- */
/* Option schemas: every switchable feature of every generator, with its family, default, and a
   one-line description. This is the single source of truth: the components parse against it,
   the docs page builds its checkbox grids from it, and the test toggles every entry. */

/** One flag entry. family groups flags on the docs page; def is the default value. */
function flag(name, family, def, text) { return { name: name, family: family, def: def, text: text }; }

/** Street corner flags. */
var CORNER_OPTIONS = [
  flag('randomCamera', 'camera', true, 'Vary camera distance and eye height per seed.'),
  flag('pitch', 'camera', false, 'Tilt the camera up for three-point perspective.'),
  flag('closeCamera', 'camera', false, 'Stand closer to the corner so the buildings loom.'),
  flag('gaps', 'massing', true, 'Break the street wall with lots, alleys and garages.'),
  flag('towers', 'massing', true, 'Let some buildings run nine floors or more.'),
  flag('setbacks', 'massing', false, 'Step tall buildings in at a random floor.'),
  flag('backRow', 'massing', false, 'A second row of taller buildings behind the first.'),
  flag('winRect', 'windows', true, 'Plain rectangular windows in the family pool.'),
  flag('winArch', 'windows', true, 'Round-arched windows in the pool.'),
  flag('winTall', 'windows', true, 'Tall narrow windows in the pool.'),
  flag('winPaired', 'windows', true, 'Paired windows with a mullion in the pool.'),
  flag('winGrid', 'windows', true, 'Industrial grids of small panes in the pool.'),
  flag('brackets', 'ornament', true, 'Brackets under the cornice.'),
  flag('quoins', 'ornament', true, 'Alternating quoins at building edges.'),
  flag('keystones', 'ornament', true, 'Keystones over arched windows.'),
  flag('rustication', 'ornament', true, 'Rustication joints across ground floors.'),
  flag('architraves', 'millwork', false, 'A moulded surround around each window.'),
  flag('lintels', 'millwork', false, 'A flat lintel over each window.'),
  flag('shutters', 'millwork', false, 'Louvred shutters flanking windows.'),
  flag('stringCourses', 'millwork', false, 'A shallow band between floors.'),
  flag('dentils', 'millwork', false, 'A row of small blocks under the cornice.'),
  flag('pediments', 'millwork', false, 'Triangular pediments over some windows.'),
  flag('pilasters', 'millwork', false, 'Flat columns between bays with capital and base.'),
  flag('transoms', 'millwork', false, 'A transom light over each shopfront.'),
  flag('parapetCaps', 'millwork', false, 'A coping cap on the parapet.'),
  flag('fireEscapes', 'millwork', false, 'An iron fire escape on one bay.'),
  flag('kerb', 'street', true, 'The kerb and pavement edge.'),
  flag('roadDashes', 'street', true, 'Centre-line dashes on the road.'),
  flag('lamps', 'street', true, 'Lamp posts along the pavement.'),
  flag('trees', 'street', true, 'Trees grown by a branching rule.'),
  flag('balconies', 'depth', false, 'Balconies with railings projecting from the facade.'),
  flag('awnings', 'depth', false, 'Striped awnings over shopfronts.'),
  flag('rooftops', 'roof', true, 'Chimneys, tanks, bulkheads, antennas, billboards.'),
  flag('gables', 'roof', false, 'A gable profile on some buildings.'),
  flag('mansards', 'roof', false, 'A mansard storey with dormers on some buildings.')
];

/** Axonometric massing flags. */
var MASSING_OPTIONS = [
  flag('terraces', 'massing', true, 'Stacks that step back as they rise, with railings.'),
  flag('towers', 'massing', true, 'Tall thin volumes with floor lines and mullions.'),
  flag('courtyards', 'massing', false, 'L and U shaped footprints with inner faces.'),
  flag('cantilevers', 'massing', false, 'Upper boxes that overhang on thin columns.'),
  flag('hatchlight', 'light', true, 'Three hatch weights as a light study.'),
  flag('openings', 'windows', false, 'Windows on the visible faces on a floor grid.'),
  flag('gables', 'roof', false, 'Pitched roofs on some boxes.'),
  flag('ground', 'context', false, 'Plot boundary, paths and trees under the model.'),
  flag('exploded', 'context', false, 'Lift each level apart with dashed guide lines.'),
  flag('randomAngle', 'camera', false, 'A different dimetric angle per seed.')
];

/** Wave Function Collapse skyline flags. */
var SKYLINE_OPTIONS = [
  flag('windows', 'windows', true, 'Window tiles on the walls.'),
  flag('doors', 'windows', true, 'Door tiles at street level.'),
  flag('bands', 'ornament', true, 'Horizontal band tiles.'),
  flag('cornices', 'ornament', true, 'A second line under every roofline.'),
  flag('streets', 'massing', true, 'Allow street tiles between buildings.')
];

/** Truss flags. */
var TRUSS_OPTIONS = [
  flag('pratt', 'web', true, 'Allow the Pratt web (verticals with diagonals to the centre).'),
  flag('warren', 'web', true, 'Allow the Warren web (alternating diagonals).'),
  flag('doubleLines', 'members', true, 'Draw members as two parallel lines.'),
  flag('gussets', 'members', true, 'Gusset circles at every joint.'),
  flag('deck', 'context', true, 'The deck line under the bottom chord.'),
  flag('piers', 'context', true, 'Piers down to hatched footings.')
];

/** Floor plan flags. */
var PLAN_OPTIONS = [
  flag('doors', 'openings', true, 'A door swing cut into every partition.'),
  flag('windows', 'openings', true, 'A window in the outer wall for every room touching it.'),
  flag('poche', 'walls', true, 'Hatch the outer wall thickness.'),
  flag('stair', 'fixtures', true, 'A stair in the largest room.')
];

/** All schemas by generator kind. */
var OPTIONS = { corner: CORNER_OPTIONS, massing: MASSING_OPTIONS, skyline: SKYLINE_OPTIONS, truss: TRUSS_OPTIONS, plan: PLAN_OPTIONS };

/** Defaults for a kind as a plain object. */
function defaults(kind) {
  var out = {};
  (OPTIONS[kind] || []).forEach(function (f) { out[f.name] = f.def; });
  return out;
}

/** Merge user options over the defaults for a kind. Unknown keys are kept. */
function resolve(kind, opts) {
  var out = defaults(kind);
  if (opts) for (var k in opts) if (opts[k] !== undefined) out[k] = opts[k];
  return out;
}

/** The subset of opts that differs from the defaults, for short snippets. */
function diffFromDefaults(kind, opts) {
  var d = defaults(kind), out = {};
  for (var k in opts) if (k in d && opts[k] !== d[k]) out[k] = opts[k];
  return out;
}

/* ---- grammar.js ---- */
/* Facade grammars: window families, the split grammar with rooftops, and gap elements.
   All draw in facade coordinates (d along the wall, h up) through a projection callback. */

/** A window family. Returns a drawer taking (d0, h0, d1, h1) that emits through line and rect. */
function windowOf(type, line, rect) {
  return function (d0, h0, d1, h1) {
    var w = d1 - d0, h = h1 - h0, dm = (d0 + d1) / 2;
    if (type === 'tall') rect(d0 + w * 0.2, h0 - h * 0.25, d1 - w * 0.2, h1);
    else if (type === 'paired') { rect(d0, h0, dm - w * 0.06, h1); rect(dm + w * 0.06, h0, d1, h1); }
    else if (type === 'grid') { rect(d0, h0, d1, h1); line(dm, h0, dm, h1); line(d0, h0 + h / 3, d1, h0 + h / 3); line(d0, h0 + 2 * h / 3, d1, h0 + 2 * h / 3); }
    else if (type === 'arch') {
      var rad = w / 2, base = h1 - rad, prev = null;
      line(d0, h0, d1, h0); line(d0, h0, d0, base); line(d1, h0, d1, base);
      for (var k = 0; k <= 8; k++) { var t = Math.PI - Math.PI * k / 8, p = [dm + rad * Math.cos(t), base + rad * Math.sin(t)]; if (prev) line(prev[0], prev[1], p[0], p[1]); prev = p; }
    }
    else rect(d0, h0, d1, h1);
  };
}

/** The plain split grammar: shell, ground band, cornice, floors of bays with rectangular windows, a door.
    proj(d, h) -> [x, y]. opts: width, floors, floorH, groundH, bayW. Returns strokes. */
function facade(r, proj, opts) {
  return facade2(r, proj, { width: opts.width, floors: opts.floors, floorH: opts.floorH, groundH: opts.groundH, bayW: opts.bayW, window: 'rect' });
}

/** Rooftop objects along the roofline at height H: chimneys, tanks, bulkheads, antennas, billboards. */
function roofscape(r, W, H, line, rect) {
  var n = Math.floor(r() * 3.4), used = 1;
  for (var i = 0; i < n && used < W - 4; i++) {
    var d = used + r() * 1.5, kind = pick(r, ['chimney', 'tank', 'bulkhead', 'antenna', 'billboard']);
    if (kind === 'chimney') { rect(d, H, d + 0.8, H + 1.3); used = d + 1.2; }
    else if (kind === 'tank') { line(d, H, d, H + 1.2); line(d + 1.6, H, d + 1.6, H + 1.2); rect(d - 0.1, H + 1.2, d + 1.7, H + 2.8); line(d - 0.1, H + 2.8, d + 0.8, H + 3.3); line(d + 0.8, H + 3.3, d + 1.7, H + 2.8); used = d + 2.2; }
    else if (kind === 'bulkhead') { rect(d, H, d + 2, H + 1.2); rect(d + 0.7, H, d + 1.3, H + 0.9); used = d + 2.5; }
    else if (kind === 'antenna') { line(d, H, d, H + 2.6); line(d - 0.4, H + 1.8, d + 0.4, H + 1.8); line(d - 0.3, H + 2.2, d + 0.3, H + 2.2); used = d + 0.8; }
    else { line(d, H, d, H + 1); line(d + 4, H, d + 4, H + 1); rect(d, H + 1, d + 4, H + 3); used = d + 4.5; }
  }
}

/** Split grammar with a window family and optional rooftop objects.
    o: width, floors, floorH, groundH, bayW, window (family name), roofscape (bool). Returns strokes. */
function facade2(r, proj, o) {
  var strokes = [], W = o.width, F = o.floors, fh = o.floorH, gh = o.groundH, bw = o.bayW, H = gh + F * fh;
  function line(d0, h0, d1, h1) { strokes.push([proj(d0, h0), proj(d1, h1)]); }
  function rect(d0, h0, d1, h1) { line(d0, h0, d1, h0); line(d1, h0, d1, h1); line(d1, h1, d0, h1); line(d0, h1, d0, h0); }
  var win = windowOf(o.window || 'rect', line, rect);
  rect(0, 0, W, H); line(0, gh, W, gh); line(0, H - 0.3, W, H - 0.3);
  var bays = Math.max(1, Math.floor(W / bw)), rb = W / bays, door = Math.floor(r() * bays);
  for (var f = 0; f < F; f++) {
    var base = gh + f * fh;
    for (var b = 0; b < bays; b++) {
      var d0 = b * rb + rb * 0.25, d1 = (b + 1) * rb - rb * 0.25;
      win(d0, base + fh * 0.25, d1, base + fh * 0.8);
      line(d0 - rb * 0.05, base + fh * 0.25, d1 + rb * 0.05, base + fh * 0.25);
    }
  }
  for (b = 0; b < bays; b++) {
    d0 = b * rb + rb * 0.25; d1 = (b + 1) * rb - rb * 0.25;
    if (b === door) rect(d0, 0, d1, gh * 0.75); else rect(d0, gh * 0.3, d1, gh * 0.85);
  }
  if (o.roofscape) roofscape(r, W, H, line, rect);
  return strokes;
}

/** A gap in the street wall: vacant lot with a fence, an alley, or a low garage.
    Returns {strokes, width} in facade units. gh: neighbouring ground-floor height. */
function gapElement(r, proj, gh) {
  var strokes = [], kind = pick(r, ['lot', 'alley', 'garage']), W;
  function line(d0, h0, d1, h1) { strokes.push([proj(d0, h0), proj(d1, h1)]); }
  function rect(d0, h0, d1, h1) { line(d0, h0, d1, h0); line(d1, h0, d1, h1); line(d1, h1, d0, h1); line(d0, h1, d0, h0); }
  if (kind === 'lot') { W = 6 + Math.floor(r() * 4); for (var d = 0; d <= W; d += 0.8) line(d, 0, d, 1.2); line(0, 1.2, W, 1.2); line(0, 0.6, W, 0.6); }
  else if (kind === 'alley') { W = 2.5; line(0.6, 0, 0.6, 0.7); line(W - 0.6, 0, W - 0.6, 0.7); }
  else { W = 5 + Math.floor(r() * 4); var h = gh * 0.85; rect(0, 0, W, h); rect(0.5, 0, W - 0.5, h * 0.7); for (var k = 1; k < 4; k++) line(0.5, h * 0.7 * k / 4, W - 0.5, h * 0.7 * k / 4); line(0, h - 0.25, W, h - 0.25); }
  return { strokes: strokes, width: W };
}

/* ---- millwork.js ---- */
/* Millwork and trim, drawn in facade coordinates through the building's line and rect helpers.
   Every function takes (o, g) where g = {line, rect, W, H, gh, fh, F} for the building and o holds
   the resolved flags. Each draws only its own element and returns nothing. Sources: see
   docs/research.md. Vocabulary: an architrave is the moulded surround of an opening, a lintel the
   flat member spanning it, a string course a shallow band across the facade, dentils the row of
   small blocks under a cornice, a pediment the low triangle over an opening, a pilaster a flat
   column against the wall, a transom the light over a door, a parapet cap the coping on top. */

/** Moulded surround around a window: a second rectangle just outside the opening. */
function architrave(g, d0, h0, d1, h1) {
  var m = 0.12;
  g.rect(d0 - m, h0 - m, d1 + m, h1 + m, 0);
}

/** Flat lintel over a window: a slim bar a little wider than the opening. */
function lintel(g, d0, h0, d1, h1) {
  g.rect(d0 - 0.15, h1 + 0.02, d1 + 0.15, h1 + 0.2, 0);
}

/** Louvred shutters flanking a window, each with two horizontal louvre lines. */
function shutters(g, d0, h0, d1, h1) {
  var w = Math.min(0.35, (d1 - d0) * 0.4);
  [[d0 - w - 0.05, d0 - 0.05], [d1 + 0.05, d1 + w + 0.05]].forEach(function (s) {
    g.rect(s[0], h0, s[1], h1, 0);
    g.line(s[0], h0 + (h1 - h0) / 3, s[1], h0 + (h1 - h0) / 3, 0);
    g.line(s[0], h0 + 2 * (h1 - h0) / 3, s[1], h0 + 2 * (h1 - h0) / 3, 0);
  });
}

/** Triangular pediment over a window, sitting on a thin entablature line. */
function pediment(g, d0, h0, d1, h1) {
  var top = h1 + 0.18, dm = (d0 + d1) / 2, rise = Math.min(0.5, (d1 - d0) * 0.35);
  g.line(d0 - 0.1, top, d1 + 0.1, top, 0);
  g.line(d0 - 0.1, top, dm, top + rise, 0);
  g.line(dm, top + rise, d1 + 0.1, top, 0);
}

/** A shallow band at the base of every upper floor, across the whole facade. */
function stringCourses(g) {
  for (var f = 1; f < g.F; f++) { var h = g.gh + f * g.fh; g.line(0, h, g.W, h, 0); g.line(0, h + 0.12, g.W, h + 0.12, 0); }
}

/** Dentil course: a row of small blocks just under the cornice line. */
function dentils(g) {
  for (var d = 0.3; d < g.W - 0.2; d += 0.36) g.rect(d, g.H - 0.55, d + 0.18, g.H - 0.4, 0);
}

/** Pilasters between bays: a flat strip with a capital line at the top and a base line at the bottom. */
function pilasters(g, bays, rb) {
  for (var b = 1; b < bays; b++) {
    var x = b * rb, w = 0.16;
    g.rect(x - w, g.gh, x + w, g.H - 0.3, 0);
    g.line(x - w - 0.08, g.H - 0.45, x + w + 0.08, g.H - 0.45, 0);
    g.line(x - w - 0.08, g.gh + 0.15, x + w + 0.08, g.gh + 0.15, 0);
  }
}

/** A transom light over a shopfront: a horizontal split near the top with two mullions above it. */
function transom(g, d0, h0, d1, h1) {
  var t = h1 - (h1 - h0) * 0.28, dm = (d0 + d1) / 2;
  g.line(d0, t, d1, t, 0);
  g.line(d0 + (dm - d0) / 2, t, d0 + (dm - d0) / 2, h1, 0);
  g.line(dm + (d1 - dm) / 2, t, dm + (d1 - dm) / 2, h1, 0);
}

/** Coping cap on the parapet: a slab slightly wider than the wall. */
function parapetCap(g) {
  g.rect(-0.1, g.H, g.W + 0.1, g.H + 0.2, 0);
}

/** An iron fire escape on one bay: platforms at each floor, a railing, and a stair between floors. */
function fireEscape(g, d0, d1) {
  var e = 0.9, a0 = d0 - 0.2, a1 = d1 + 0.2;
  for (var f = 0; f < g.F; f++) {
    var h = g.gh + f * g.fh + 0.1;
    g.line(a0, h, a1, h, e); g.line(a0, h, a0, h, 0, e); g.line(a1, h, a1, h, 0, e);
    g.line(a0, h + 0.9, a1, h + 0.9, e); g.line(a0, h, a0, h + 0.9, e); g.line(a1, h, a1, h + 0.9, e);
    for (var p = a0 + 0.3; p < a1; p += 0.3) g.line(p, h, p, h + 0.9, e);
    if (f < g.F - 1) { var top = h + g.fh; g.line(f % 2 ? a1 : a0, h, f % 2 ? a0 : a1, top, e); g.line(f % 2 ? a1 : a0, h + 0.9, f % 2 ? a0 : a1, top + 0.9, e); }
  }
}

/** A gable profile over the parapet: a triangle whose ridge is a quarter of the width up. */
function gable(g) {
  var rise = Math.min(g.W * 0.25, 3.5);
  g.line(0, g.H, g.W / 2, g.H + rise, 0);
  g.line(g.W / 2, g.H + rise, g.W, g.H, 0);
}

/** A mansard storey: a steep trapezoid on top with two or three dormer windows. */
function mansard(g, r) {
  var rise = 1.6, inset = 0.8;
  g.line(0, g.H, inset, g.H + rise, 0); g.line(inset, g.H + rise, g.W - inset, g.H + rise, 0); g.line(g.W - inset, g.H + rise, g.W, g.H, 0);
  var n = 2 + Math.floor(r() * 2), step = (g.W - 2 * inset) / (n + 1);
  for (var i = 1; i <= n; i++) { var c = inset + step * i; g.rect(c - 0.35, g.H + 0.3, c + 0.35, g.H + 1.1, 0); g.line(c - 0.45, g.H + 1.1, c, g.H + 1.4, 0); g.line(c, g.H + 1.4, c + 0.45, g.H + 1.1, 0); }
}

var mw = { architrave, lintel, shutters, pediment, stringCourses, dentils, pilasters, transom, parapetCap, fireEscape, gable, mansard };

/* ---- wfc.js ---- */
/* Wave Function Collapse on a grid of socketed tiles. */

/** Collapse a cols x rows grid. tiles: [{sockets: {T, R, B, L}, weight}]. Two tiles may touch
    when the facing sockets match. bounds: socket values required at the grid edges, or null.
    Returns an array of tile indices (row-major), or null after maxTries contradictions. */
function wfc(r, tiles, cols, rows, bounds, maxTries) {
  var opp = { T: 'B', R: 'L', B: 'T', L: 'R' };
  var dirs = { T: [0, -1], R: [1, 0], B: [0, 1], L: [-1, 0] };
  function attempt() {
    var cells = [];
    for (var i = 0; i < cols * rows; i++) cells.push(tiles.map(function (_, k) { return k; }));
    function at(x, y) { return cells[y * cols + x]; }
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      cells[y * cols + x] = at(x, y).filter(function (k) {
        var s = tiles[k].sockets;
        return (y > 0 || !bounds.T || s.T === bounds.T) && (y < rows - 1 || !bounds.B || s.B === bounds.B)
            && (x > 0 || !bounds.L || s.L === bounds.L) && (x < cols - 1 || !bounds.R || s.R === bounds.R);
      });
    }
    function propagate(sx, sy) {
      var q = [[sx, sy]];
      while (q.length) {
        var c = q.pop(), x = c[0], y = c[1], here = at(x, y);
        for (var d in dirs) {
          var nx = x + dirs[d][0], ny = y + dirs[d][1];
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          var there = at(nx, ny), ok = {};
          here.forEach(function (k) { ok[tiles[k].sockets[d]] = true; });
          var kept = there.filter(function (k) { return ok[tiles[k].sockets[opp[d]]]; });
          if (kept.length === 0) return false;
          if (kept.length < there.length) { cells[ny * cols + nx] = kept; q.push([nx, ny]); }
        }
      }
      return true;
    }
    for (var y2 = 0; y2 < rows; y2++) for (var x2 = 0; x2 < cols; x2++) if (!propagate(x2, y2)) return null;
    for (;;) {
      var best = -1, bestN = Infinity;
      for (var i2 = 0; i2 < cells.length; i2++) {
        var n = cells[i2].length;
        if (n > 1 && (n < bestN || (n === bestN && r() < 0.5))) { best = i2; bestN = n; }
      }
      if (best < 0) return cells.map(function (c) { return c[0]; });
      var opts = cells[best], total = 0;
      opts.forEach(function (k) { total += tiles[k].weight || 1; });
      var pickAt = r() * total, chosen = opts[opts.length - 1];
      for (var j = 0; j < opts.length; j++) { pickAt -= tiles[opts[j]].weight || 1; if (pickAt <= 0) { chosen = opts[j]; break; } }
      cells[best] = [chosen];
      if (!propagate(best % cols, Math.floor(best / cols))) return null;
    }
  }
  for (var t = 0; t < (maxTries || 20); t++) { var g = attempt(); if (g) return g; }
  return null;
}

/* ---- render.js ---- */
/* Rendering: a progress renderer and the animation runners.
   A drawing is a list of items {fills, glows, strokes} in draw order. fills are page-colour
   polygons for hidden-line removal; glows are {poly, k} window polygons lit when k is under the
   glow probability; strokes are [[x0, y0], [x1, y1]] segments. */

/** True when the viewer asked for reduced motion (false outside a browser). */
function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Fill one polygon with the current fill style. */
function fillPoly(ctx, p) {
  ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
  for (var k = 1; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]);
  ctx.closePath(); ctx.fill();
}

/** Lit windows: fill the chosen glow polygons with a soft shadow so they read as light. */
function drawGlows(ctx, glows, opts) {
  if (!opts.glow || !glows || !glows.length) return;
  var prob = opts.glowProb == null ? 0.35 : opts.glowProb;
  ctx.save(); ctx.fillStyle = opts.glow; ctx.shadowColor = opts.glow; ctx.shadowBlur = opts.glowBlur == null ? 10 : opts.glowBlur;
  for (var i = 0; i < glows.length; i++) if (glows[i].k < prob) fillPoly(ctx, glows[i].poly);
  ctx.restore();
}

/** Draw items up to px of total stroke length. Clears first. Each item's fills and glows appear
    as soon as that item starts, which is what removes hidden lines mid-plot.
    opts: color, page, glow (hex or falsy), glowProb, glowBlur. */
function renderTo(ctx, items, px, opts) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineWidth = 1; ctx.strokeStyle = opts.color || '#C4C6CB'; ctx.fillStyle = opts.page || '#FFFFFF'; ctx.lineCap = 'round';
  var left = px;
  for (var i = 0; i < items.length && left > 0; i++) {
    var it = items[i];
    ctx.fillStyle = opts.page || '#FFFFFF';
    (it.fills || []).forEach(function (p) { fillPoly(ctx, p); });
    drawGlows(ctx, it.glows, opts);
    ctx.beginPath();
    for (var j = 0; j < it.strokes.length && left > 0; j++) {
      var s = it.strokes[j], L = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) || 0.001, f = Math.min(1, left / L);
      ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[0][0] + (s[1][0] - s[0][0]) * f, s[0][1] + (s[1][1] - s[0][1]) * f);
      left -= L;
    }
    ctx.stroke();
  }
}

/** Total stroke length of a drawing, in canvas px. */
function totalLength(items) {
  var t = 0;
  items.forEach(function (it) { it.strokes.forEach(function (s) { t += Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]); }); });
  return t;
}

/** Speeds that plot a drawing in about secondsIn and out in about secondsOut. */
function speedsFor(items, secondsIn, secondsOut) {
  var len = totalLength(items);
  return { pxPerSecond: len / (secondsIn || 7), pxPerSecondOut: len / (secondsOut || 4) };
}

/** Draw in once and stop. opts: color, page, glow, pxPerSecond, instant. Returns a stop function. */
function drawIn(ctx, items, opts) {
  var total = totalLength(items), speed = opts.pxPerSecond || 2000;
  if (reducedMotion() || opts.instant) { renderTo(ctx, items, total, opts); return function () {}; }
  var p = 0, last = null, stopped = false;
  function frame(t) {
    if (stopped) return;
    var dt = last === null ? 0 : t - last; last = t;
    p = Math.min(total, p + dt / 1000 * speed);
    renderTo(ctx, items, p, opts);
    if (p < total) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return function () { stopped = true; };
}

/** Bounce: draw in at pxPerSecond, hold, draw out at pxPerSecondOut, hold, repeat.
    opts.onEmpty may return {items, pxPerSecond, pxPerSecondOut} at the bottom of a cycle to
    swap in a new drawing without a visible jump. Under reduced motion or opts.instant the
    finished drawing renders once. Returns a stop function. */
function bounce(ctx, items, opts) {
  var total = totalLength(items), speedIn = opts.pxPerSecond || 2000, speedOut = opts.pxPerSecondOut || speedIn * 1.6;
  var holdFull = opts.holdFull == null ? 4000 : opts.holdFull, holdEmpty = opts.holdEmpty == null ? 800 : opts.holdEmpty;
  if (reducedMotion() || opts.instant) { renderTo(ctx, items, total, opts); return function () {}; }
  var p = 0, dir = 1, wait = 0, last = null, stopped = false;
  function frame(t) {
    if (stopped) return;
    var dt = last === null ? 0 : (t - last); last = t;
    if (wait > 0) { wait -= dt; }
    else {
      p += dir * dt / 1000 * (dir > 0 ? speedIn : speedOut);
      if (p >= total) { p = total; dir = -1; wait = holdFull; }
      if (p <= 0) {
        p = 0; dir = 1; wait = holdEmpty;
        var next = opts.onEmpty && opts.onEmpty();
        if (next && next.items) { items = next.items; total = totalLength(items); speedIn = next.pxPerSecond || speedIn; speedOut = next.pxPerSecondOut || speedOut; }
      }
      renderTo(ctx, items, p, opts);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return function () { stopped = true; };
}

/* ---- massing.js ---- */
/* Axonometric massing: box clusters, decorated box drawings, and the fitted massing scene.
   Every feature is a flag in MASSING_OPTIONS (src/options.js). */

/** A seeded cluster of stacked boxes on a grid, sorted far to near for painter's order.
    opts: count, grid. Returns [{x, y, z, dx, dy, dz}]. */
function massing(r, opts) {
  var n = opts.count || 14, g = opts.grid || 6, boxes = [], height = {};
  for (var i = 0; i < n; i++) {
    var dx = 1 + Math.floor(r() * 3), dy = 1 + Math.floor(r() * 3);
    var x = Math.floor(r() * (g - dx + 1)), y = Math.floor(r() * (g - dy + 1));
    var base = 0;
    for (var ix = x; ix < x + dx; ix++) for (var iy = y; iy < y + dy; iy++) base = Math.max(base, height[ix + ',' + iy] || 0);
    var dz = 1 + Math.floor(r() * 4);
    for (ix = x; ix < x + dx; ix++) for (iy = y; iy < y + dy; iy++) height[ix + ',' + iy] = base + dz;
    boxes.push({ x: x, y: y, z: base, dx: dx, dy: dy, dz: dz });
  }
  boxes.sort(painterOrder);
  return boxes;
}

/** Painter's order for axis-aligned boxes viewed from +x, +y, +z: by the sum of centre coordinates. */
function painterOrder(a, b) {
  return (a.x + a.dx / 2 + a.y + a.dy / 2 + a.z + a.dz / 2) - (b.x + b.dx / 2 + b.y + b.dy / 2 + b.z + b.dz / 2);
}

/** Hatch a parallelogram face with origin P and edge vectors U, V: lines parallel to V spaced along U. */
function hatchFace(P, U, V, spacing, out) {
  var L = Math.hypot(U[0], U[1]);
  for (var k = spacing; k < L; k += spacing) { var a = [P[0] + U[0] * k / L, P[1] + U[1] * k / L]; out.push([a, [a[0] + V[0], a[1] + V[1]]]); }
}

/** Visible faces of a box plus hatch lines on the +x face. iso: projection. Returns {fills, strokes}. */
function boxDrawing(b, iso, hatchSpacing) {
  return boxDrawing2(b, iso, 1, { hatch: hatchSpacing });
}

/** The lift applied to a box in an exploded view (zero otherwise). */
function lift(b) { return b.lift || 0; }

/** The three visible face polygons of a box: top, +x face, +y face. */
function faces(b, iso) {
  var X = b.x + b.dx, Y = b.y + b.dy, z0 = b.z + lift(b), Z = z0 + b.dz;
  return {
    top: [iso(b.x, b.y, Z), iso(X, b.y, Z), iso(X, Y, Z), iso(b.x, Y, Z)],
    fx: [iso(X, b.y, z0), iso(X, Y, z0), iso(X, Y, Z), iso(X, b.y, Z)],
    fy: [iso(b.x, Y, z0), iso(X, Y, z0), iso(X, Y, Z), iso(b.x, Y, Z)]
  };
}

/** Floor lines and mullions on a tower's two visible faces. */
function towerLines(b, iso, s) {
  var X = b.x + b.dx, Y = b.y + b.dy, z0 = b.z + lift(b), Z = z0 + b.dz;
  for (var k = 1; k < b.dz; k++) { s.push([iso(X, b.y, z0 + k), iso(X, Y, z0 + k)]); s.push([iso(b.x, Y, z0 + k), iso(X, Y, z0 + k)]); }
  for (var m = 0.5; m < b.dy; m += 0.5) s.push([iso(X, b.y + m, z0), iso(X, b.y + m, Z)]);
  for (m = 0.5; m < b.dx; m += 0.5) s.push([iso(b.x + m, Y, z0), iso(b.x + m, Y, Z)]);
}

/** Railing ticks along the exposed roof edges of a terrace, plus a stair on request. */
function terraceLines(b, iso, s) {
  var X = b.x + b.dx, Y = b.y + b.dy, Z = b.z + lift(b) + b.dz, rail = 0.18;
  for (var t = 0; t <= b.dy; t += 0.3) s.push([iso(X, b.y + t, Z), iso(X, b.y + t, Z + rail)]);
  for (t = 0; t <= b.dx; t += 0.3) s.push([iso(b.x + t, Y, Z), iso(b.x + t, Y, Z + rail)]);
  s.push([iso(X, b.y, Z + rail), iso(X, Y, Z + rail)]); s.push([iso(b.x, Y, Z + rail), iso(X, Y, Z + rail)]);
  if (b.stair) for (var k = 0; k < 5; k++) s.push([iso(b.x + 0.2, b.y + 0.2 + k * 0.15, Z), iso(b.x + 0.8, b.y + 0.2 + k * 0.15, Z)]);
}

/** Windows on both visible faces on a floor grid: one small rectangle per floor per half unit. */
function openings(b, iso, s, glows, r) {
  var X = b.x + b.dx, Y = b.y + b.dy, z0 = b.z + lift(b);
  for (var k = 0; k < b.dz; k++) {
    for (var m = 0; m < b.dy; m += 0.5) { var p = [iso(X, b.y + m + 0.12, z0 + k + 0.3), iso(X, b.y + m + 0.38, z0 + k + 0.3), iso(X, b.y + m + 0.38, z0 + k + 0.75), iso(X, b.y + m + 0.12, z0 + k + 0.75)]; quad(p, s); glows.push({ poly: p, k: r() }); }
    for (m = 0; m < b.dx; m += 0.5) { p = [iso(b.x + m + 0.12, Y, z0 + k + 0.3), iso(b.x + m + 0.38, Y, z0 + k + 0.3), iso(b.x + m + 0.38, Y, z0 + k + 0.75), iso(b.x + m + 0.12, Y, z0 + k + 0.75)]; quad(p, s); glows.push({ poly: p, k: r() }); }
  }
}

/** Push the four edges of a quad as strokes. */
function quad(p, s) { for (var i = 0; i < 4; i++) s.push([p[i], p[(i + 1) % 4]]); }

/** A gable roof on a box: ridge along x, two slopes, the +x face becomes a pentagon. Returns fills. */
function gableRoof(b, iso, s) {
  var X = b.x + b.dx, Y = b.y + b.dy, Z = b.z + lift(b) + b.dz, ym = b.y + b.dy / 2, h = b.dy * 0.45;
  var back = [iso(b.x, b.y, Z), iso(X, b.y, Z), iso(X, ym, Z + h), iso(b.x, ym, Z + h)];
  var front = [iso(b.x, Y, Z), iso(X, Y, Z), iso(X, ym, Z + h), iso(b.x, ym, Z + h)];
  quad(back, s); quad(front, s);
  s.push([iso(X, b.y, Z), iso(X, ym, Z + h)], [iso(X, ym, Z + h), iso(X, Y, Z)]);
  return [back, front];
}

/** Thin columns from the underside of an overhanging box down to the ground or the box below. */
function columns(b, iso, s) {
  var z0 = b.z + lift(b), zb = b.support || 0;
  [[b.x + 0.15, b.y + 0.15], [b.x + b.dx - 0.15, b.y + 0.15], [b.x + 0.15, b.y + b.dy - 0.15], [b.x + b.dx - 0.15, b.y + b.dy - 0.15]].forEach(function (c) {
    s.push([iso(c[0], c[1], zb), iso(c[0], c[1], z0)]);
  });
}

/** Dashed guide line from a lifted box down to where it sits, as short segments. */
function guides(b, iso, s) {
  var z0 = b.z + lift(b), corners = [[b.x, b.y], [b.x + b.dx, b.y], [b.x, b.y + b.dy], [b.x + b.dx, b.y + b.dy]];
  corners.forEach(function (c) { for (var z = b.z; z < z0; z += 0.3) s.push([iso(c[0], c[1], z), iso(c[0], c[1], Math.min(z0, z + 0.15))]); });
}

/** Decorated box drawing: outlines, tower or terrace detail, gable, openings, columns, and hatching.
    F.hatchlight gives three weights (top blank, +x single, +y cross); otherwise the +x face is hatched.
    Returns {fills, glows, strokes}. */
function boxDrawing2(b, iso, u, F) {
  F = F || {};
  var fc = faces(b, iso), s = [], glows = [], fills = [fc.top, fc.fx, fc.fy];
  if (b.gable) fills = [fc.fx, fc.fy].concat(gableRoof(b, iso, s));
  else quad(fc.top, s);
  quad(fc.fx, s); quad(fc.fy, s);
  if (b.tower) towerLines(b, iso, s);
  if (b.terrace && !b.gable) terraceLines(b, iso, s);
  if (b.openings && !b.tower) openings(b, iso, s, glows, F.r || function () { return 1; });
  if (b.columns) columns(b, iso, s);
  if (b.lift) guides(b, iso, s);
  var Px = fc.fx[0], Ux = [fc.fx[3][0] - Px[0], fc.fx[3][1] - Px[1]], Vx = [fc.fx[1][0] - Px[0], fc.fx[1][1] - Px[1]];
  if (!b.tower && !b.openings) {
    if (F.hatchlight) {
      hatchFace(Px, Ux, Vx, 6, s);
      var Py = fc.fy[0], Uy = [fc.fy[3][0] - Py[0], fc.fy[3][1] - Py[1]], Vy = [fc.fy[1][0] - Py[0], fc.fy[1][1] - Py[1]];
      hatchFace(Py, Uy, Vy, 5, s); hatchFace(Py, Vy, Uy, 5, s);
    } else if (F.hatch !== 0) hatchFace(Px, Ux, Vx, F.hatch || 6, s);
  }
  return { fills: fills, glows: glows, strokes: s };
}

/** Stepped terrace stacks: each level steps back at random as it rises. */
function terraceStacks(r, boxes, baseAt) {
  var stacks = 2 + Math.floor(r() * 2);
  for (var s = 0; s < stacks; s++) {
    var x = Math.floor(r() * 3), y = Math.floor(r() * 3), w = 4 + Math.floor(r() * 3), d = 4 + Math.floor(r() * 3);
    var z = baseAt(x, y, w, d), levels = 5 + Math.floor(r() * 4);
    for (var l = 0; l < levels && w >= 1 && d >= 1; l++) {
      var dz = 1 + Math.floor(r() * 3);
      boxes.push({ x: x, y: y, z: z, dx: w, dy: d, dz: dz, terrace: true, stair: r() < 0.5 });
      z += dz;
      if (r() < 0.55) { x += 1; w -= 1; } if (r() < 0.55) { y += 1; d -= 1; }
      if (r() < 0.3) { w -= 1; } if (r() < 0.3) { d -= 1; }
    }
  }
}

/** Courtyard footprints: an L or U made of two or three touching boxes of one height. */
function courtyardBlocks(r, boxes, baseAt, g) {
  var n = 1 + Math.floor(r() * 2);
  for (var i = 0; i < n; i++) {
    var x = Math.floor(r() * (g - 4)), y = Math.floor(r() * (g - 4)), w = 3 + Math.floor(r() * 2), d = 3 + Math.floor(r() * 2), dz = 2 + Math.floor(r() * 3);
    var z = baseAt(x, y, w, d);
    boxes.push({ x: x, y: y, z: z, dx: w, dy: 1, dz: dz });
    boxes.push({ x: x, y: y + 1, z: z, dx: 1, dy: d - 1, dz: dz });
    if (r() < 0.6) boxes.push({ x: x + w - 1, y: y + 1, z: z, dx: 1, dy: d - 1, dz: dz });
  }
}

/** Towers: tall thin volumes placed on top of whatever is already at their cell. */
function towerBlocks(r, boxes, baseAt, g) {
  var n = 2 + Math.floor(r() * 3);
  for (var i = 0; i < n; i++) {
    var tx = Math.floor(r() * g), ty = Math.floor(r() * g), tdx = 1 + (r() < 0.3 ? 1 : 0), tdy = 1 + (r() < 0.3 ? 1 : 0);
    boxes.push({ x: tx, y: ty, z: baseAt(tx, ty, tdx, tdy), dx: tdx, dy: tdy, dz: 8 + Math.floor(r() * 9), tower: true });
  }
}

/** Cantilevers: some raised boxes grow one unit past their support and get columns underneath. */
function cantilever(r, boxes) {
  boxes.forEach(function (b) {
    if (b.z > 0 && !b.tower && r() < 0.35) { b.dx += 1; b.columns = true; b.support = 0; }
  });
}

/** Ground context: plot boundary as dashes, two paths, and a few tree circles outside the boxes. */
function groundContext(r, boxes, g, iso) {
  var s = [], m = 1.2;
  function dash(a, b) { var n = 18; for (var k = 0; k < n; k += 2) { var t0 = k / n, t1 = (k + 1) / n; s.push([iso(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, 0), iso(a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, 0)]); } }
  dash([-m, -m], [g + m, -m]); dash([g + m, -m], [g + m, g + m]); dash([g + m, g + m], [-m, g + m]); dash([-m, g + m], [-m, -m]);
  s.push([iso(-m, g * 0.5, 0), iso(g + m, g * 0.5, 0)], [iso(g * 0.5, -m, 0), iso(g * 0.5, g + m, 0)]);
  for (var i = 0; i < 6; i++) {
    var cx = -0.6 + r() * (g + 1.2), cy = -0.6 + r() * (g + 1.2), free = true;
    boxes.forEach(function (b) { if (cx > b.x - 0.4 && cx < b.x + b.dx + 0.4 && cy > b.y - 0.4 && cy < b.y + b.dy + 0.4) free = false; });
    if (!free) continue;
    var prev = null;
    for (var k = 0; k <= 12; k++) { var t = k / 12 * Math.PI * 2, p = iso(cx + 0.35 * Math.cos(t), cy + 0.35 * Math.sin(t), 0); if (prev) s.push([prev, p]); prev = p; }
  }
  return s;
}

/** The massing scene: generated in unit space, measured, and fitted to region R = {x, y, w, h}.
    opts: see MASSING_OPTIONS. Returns items. */
function massing3(r, R, opts) {
  var F = resolve('massing', opts), boxes = [], g = 8;
  function baseAt(x, y, dx, dy) { var z = 0; boxes.forEach(function (b) { if (x < b.x + b.dx && x + dx > b.x && y < b.y + b.dy && y + dy > b.y) z = Math.max(z, b.z + b.dz); }); return z; }
  if (F.terraces) terraceStacks(r, boxes, baseAt); else boxes = massing(r, { count: 14, grid: g });
  if (F.courtyards) courtyardBlocks(r, boxes, baseAt, g);
  if (F.towers) towerBlocks(r, boxes, baseAt, g);
  if (F.cantilevers) cantilever(r, boxes);
  /** True when nothing sits on top of box b. */
  function isTop(b) { return !boxes.some(function (o) { return o !== b && o.z === b.z + b.dz && o.x < b.x + b.dx && o.x + o.dx > b.x && o.y < b.y + b.dy && o.y + o.dy > b.y; }); }
  boxes.forEach(function (b) {
    if (F.gables && !b.tower && isTop(b) && r() < 0.5) b.gable = true;
    if (F.openings && !b.tower) b.openings = true;
    if (F.exploded) b.lift = b.z * 0.6 + (b.z > 0 ? 0.6 : 0);
  });
  boxes.sort(painterOrder);
  var deg = F.randomAngle ? 20 + r() * 20 : 30, raw = makeIso(0, 0, 1, deg), x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  var pad = F.ground ? 1.2 : 0;
  boxes.concat([{ x: -pad, y: -pad, z: 0, dx: g + 2 * pad, dy: g + 2 * pad, dz: 0 }]).forEach(function (b) {
    for (var c = 0; c < 8; c++) {
      var p = raw(b.x + (c & 1 ? b.dx : 0), b.y + (c & 2 ? b.dy : 0), b.z + lift(b) + (c & 4 ? b.dz + (b.gable ? b.dy * 0.45 : 0.3) : 0));
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
    }
  });
  var u = Math.min(R.w * 0.92 / (x1 - x0), R.h * 0.88 / (y1 - y0));
  var ox = R.x + (R.w - (x1 - x0) * u) / 2 - x0 * u, oy = R.y + R.h * 0.94 - y1 * u;
  var iso = makeIso(ox, oy, u, deg), items = [];
  if (F.ground) items.push({ strokes: groundContext(r, boxes, g, iso) });
  var flags = { hatchlight: F.hatchlight, r: r };
  boxes.forEach(function (b) { items.push(boxDrawing2(b, iso, u, flags)); });
  return items;
}

/* ---- corner.js ---- */
/* The street corner: a 3D street seen through a pinhole camera, fitted to a region.
   Every feature is a flag in CORNER_OPTIONS (src/options.js). The default recipe is
   split-grammar facades with window families, rooftops, gaps, ornament, and the street in
   front. The legacy shorthands `full` (the crowded recipe) and `pitch` still work. */

/** A side of the street: pt(d, h, e) -> world, e outward from the facade toward the camera. */
function side(isRight) {
  return { pt: isRight ? function (d, h, e) { return [d, -e, h]; } : function (d, h, e) { return [-e, d, h]; } };
}

/** Resolve options, expanding the legacy `full` shorthand into its flags. */
function cornerOptions(opts) {
  var o = resolve('corner', opts);
  if (opts && opts.full) { o.backRow = true; o.balconies = true; o.awnings = true; o.setbacks = true; o.closeCamera = true; }
  return o;
}

/** Ornament on a facade: cornice brackets, rustication joints, alternating quoins. */
function ornament(o, g) {
  if (o.brackets) for (var d = 0.4; d < g.W; d += 0.6) g.line(d, g.H - 0.3, d, g.H - 0.6, 0);
  if (o.rustication && g.gh > 0) for (var hh = 0.6; hh < g.gh; hh += 0.6) g.line(0, hh, g.W, hh, 0);
  if (o.quoins) for (var q = g.gh; q < g.H - 0.6; q += g.fh / 2) {
    var qw = (Math.round(q / (g.fh / 2)) % 2) ? 0.45 : 0.7;
    g.rect(0, q, qw, q + g.fh / 2, 0); g.rect(g.W - qw, q, g.W, q + g.fh / 2, 0);
  }
}

/** A balcony projecting from the facade under one window: slab, returns, and railing posts. */
function balcony(d0, d1, bh, line) {
  var e = 1.1, a0 = d0 - 0.15, a1 = d1 + 0.15;
  line(a0, bh, a1, bh, e); line(a0, bh + 0.15, a1, bh + 0.15, e);
  line(a0, bh, a0, bh, 0, e); line(a1, bh, a1, bh, 0, e); line(a0, bh + 0.15, a0, bh + 0.15, 0, e); line(a1, bh + 0.15, a1, bh + 0.15, 0, e);
  for (var p = a0; p <= a1 + 0.01; p += 0.35) line(p, bh + 0.15, p, bh + 1.0, e);
  line(a0, bh + 1.0, a1, bh + 1.0, e); line(a0, bh + 1.0, a0, bh + 1.0, 0, e); line(a1, bh + 1.0, a1, bh + 1.0, 0, e);
}

/** A striped awning over a ground-floor bay. */
function awning(d0, d1, gh, line) {
  var t0 = gh * 0.8, t1 = gh * 0.62, ea = 1.4;
  line(d0, t0, d1, t0, 0); line(d0, t1, d1, t1, ea); line(d0, t0, d0, t1, 0, ea); line(d1, t0, d1, t1, 0, ea);
  for (var k = 1; k < 4; k++) { var dd = d0 + (d1 - d0) * k / 4; line(dd, t0, dd, t1, 0, ea); }
}

/** Rooftop objects set a little behind the parapet. */
function rooftops(r, g) {
  var n = Math.floor(r() * 3.4), used = 1, W = g.W, H = g.H;
  for (var i = 0; i < n && used < W - 4; i++) {
    var d = used + r() * 1.5, kind = pick(r, ['chimney', 'tank', 'bulkhead', 'antenna', 'billboard']), e = -(1 + r() * 3);
    if (kind === 'chimney') { g.rect(d, H, d + 0.8, H + 1.3, e); used = d + 1.2; }
    else if (kind === 'tank') { g.line(d, H, d, H + 1.2, e); g.line(d + 1.6, H, d + 1.6, H + 1.2, e); g.rect(d - 0.1, H + 1.2, d + 1.7, H + 2.8, e); g.line(d - 0.1, H + 2.8, d + 0.8, H + 3.3, e); g.line(d + 0.8, H + 3.3, d + 1.7, H + 2.8, e); used = d + 2.2; }
    else if (kind === 'bulkhead') { g.rect(d, H, d + 2, H + 1.2, e); g.rect(d + 0.7, H, d + 1.3, H + 0.9, e); used = d + 2.5; }
    else if (kind === 'antenna') { g.line(d, H, d, H + 2.6, e); g.line(d - 0.4, H + 1.8, d + 0.4, H + 1.8, e); g.line(d - 0.3, H + 2.2, d + 0.3, H + 2.2, e); used = d + 0.8; }
    else { g.line(d, H, d, H + 1, e); g.line(d + 4, H, d + 4, H + 1, e); g.rect(d, H + 1, d + 4, H + 3, e); used = d + 4.5; }
  }
}

/** The window trim chosen for one building, applied around one opening. */
function trim(o, g, d0, h0, d1, h1) {
  if (o.architraves) mw.architrave(g, d0, h0, d1, h1);
  if (o.lintels) mw.lintel(g, d0, h0, d1, h1);
  if (o.shutters) mw.shutters(g, d0, h0, d1, h1);
  if (o.pediments) mw.pediment(g, d0, h0, d1, h1);
}

/** The upper floors of a building: windows, sills, trim, balconies. */
function floors(r, o, g, bays, rb, win) {
  for (var fl = 0; fl < g.F; fl++) {
    var base = g.gh + fl * g.fh, balconyFloor = o.balconies && r() < 0.4;
    for (var b = 0; b < bays; b++) {
      var d0 = b * rb + rb * 0.25, d1 = (b + 1) * rb - rb * 0.25, h0 = base + g.fh * 0.25, h1 = base + g.fh * 0.8;
      win(d0, h0, d1, h1);
      g.glow(d0, h0, d1, h1);
      if (o.window === 'arch' && o.keystones) g.line((d0 + d1) / 2, h1, (d0 + d1) / 2, base + g.fh * 0.95, 0);
      g.line(d0 - rb * 0.05, h0, d1 + rb * 0.05, h0, 0);
      trim(o, g, d0, h0, d1, h1);
      if (balconyFloor && r() < 0.6) balcony(d0, d1, base + g.fh * 0.2, g.line);
    }
  }
}

/** The ground floor: a door in one bay and shopfronts in the rest, with optional transoms and awnings. */
function groundFloor(r, o, g, bays, rb, door) {
  for (var b = 0; b < bays; b++) {
    var d0 = b * rb + rb * 0.25, d1 = (b + 1) * rb - rb * 0.25;
    if (b === door) { g.rect(d0, 0, d1, g.gh * 0.75, 0); if (o.transoms) g.line(d0, g.gh * 0.6, d1, g.gh * 0.6, 0); continue; }
    g.rect(d0, g.gh * 0.3, d1, g.gh * 0.85, 0);
    g.glow(d0, g.gh * 0.3, d1, g.gh * 0.85);
    if (o.transoms) mw.transom(g, d0, g.gh * 0.3, d1, g.gh * 0.85);
    if (o.awnings && r() < 0.6) awning(d0, d1, g.gh, g.line);
  }
}

/** One building on a side, in 3D. Returns {fills, glows, strokes}. The fill is the facade quad. */
function building(r, cam, S, o) {
  var strokes = [], fills = [], glows = [], h0 = o.h0 || 0;
  function P(d, h, e) { return cam(S.pt(o.off + d, h0 + h, e || 0)); }
  var g = {
    W: o.width, gh: o.groundH, F: o.floors, fh: o.floorH, H: o.groundH + o.floors * o.floorH,
    line: function (d0, hA, d1, h1, e0, e1) { strokes.push([P(d0, hA, e0), P(d1, h1, e1 == null ? e0 : e1)]); },
    rect: function (d0, hA, d1, h1, e) { g.line(d0, hA, d1, hA, e); g.line(d1, hA, d1, h1, e); g.line(d1, h1, d0, h1, e); g.line(d0, h1, d0, hA, e); },
    glow: function (d0, hA, d1, h1) { glows.push({ poly: [P(d0, hA, 0), P(d1, hA, 0), P(d1, h1, 0), P(d0, h1, 0)], k: r() }); }
  };
  var win = windowOf(o.window, g.line, function (a, b, c, d) { g.rect(a, b, c, d, 0); });
  fills.push([P(0, 0, 0), P(g.W, 0, 0), P(g.W, g.H, 0), P(0, g.H, 0)]);
  g.rect(0, 0, g.W, g.H, 0);
  if (g.gh > 0) g.line(0, g.gh, g.W, g.gh, 0);
  g.line(0, g.H - 0.3, g.W, g.H - 0.3, 0);
  ornament(o, g);
  if (o.stringCourses) mw.stringCourses(g);
  if (o.dentils) mw.dentils(g);
  if (o.parapetCaps) mw.parapetCap(g);
  var bays = Math.max(1, Math.floor(g.W / o.bayW)), rb = g.W / bays, door = o.door ? Math.floor(r() * bays) : -1;
  if (o.pilasters) mw.pilasters(g, bays, rb);
  floors(r, o, g, bays, rb, win);
  if (g.gh > 0) groundFloor(r, o, g, bays, rb, door);
  if (o.fireEscape) { var fb = Math.floor(r() * bays); mw.fireEscape(g, fb * rb + rb * 0.25, (fb + 1) * rb - rb * 0.25); }
  if (o.roof === 'gable') mw.gable(g); else if (o.roof === 'mansard') mw.mansard(g, r);
  if (o.rooftops && o.roof !== 'gable') rooftops(r, g);
  return { fills: fills, glows: glows, strokes: strokes };
}

/** A gap in the street wall in 3D: vacant lot, alley, or garage. Returns {strokes, width}. */
function gap(r, cam, S, off, gh) {
  var strokes = [], kind = pick(r, ['lot', 'alley', 'garage']), W;
  function P(d, h, e) { return cam(S.pt(off + d, h, e || 0)); }
  function line(d0, h0, d1, h1, e) { strokes.push([P(d0, h0, e), P(d1, h1, e)]); }
  function rect(d0, h0, d1, h1, e) { line(d0, h0, d1, h0, e); line(d1, h0, d1, h1, e); line(d1, h1, d0, h1, e); line(d0, h1, d0, h0, e); }
  if (kind === 'lot') { W = 6 + Math.floor(r() * 4); for (var d = 0; d <= W; d += 0.8) line(d, 0, d, 1.2, 0); line(0, 1.2, W, 1.2, 0); line(0, 0.6, W, 0.6, 0); }
  else if (kind === 'alley') { W = 2.5; line(0.6, 0, 0.6, 0.7, 0); line(W - 0.6, 0, W - 0.6, 0.7, 0); }
  else { W = 5 + Math.floor(r() * 4); var h = gh * 0.85; rect(0, 0, W, h, 0); rect(0.5, 0, W - 0.5, h * 0.7, 0); for (var k = 1; k < 4; k++) line(0.5, h * 0.7 * k / 4, W - 0.5, h * 0.7 * k / 4, 0); line(0, h - 0.25, W, h - 0.25, 0); }
  return { strokes: strokes, width: W };
}

/** Street furniture along one side, each family behind its flag: kerb, road dashes, lamps, trees. */
function street(r, cam, S, L, o) {
  var strokes = [];
  function P(d, h, e) { return cam(S.pt(d, h, e)); }
  if (o.kerb) strokes.push([P(0, 0, 3), P(L, 0, 3)], [P(0, 0.15, 3), P(L, 0.15, 3)], [P(0, 0.15, 3.2), P(L, 0.15, 3.2)]);
  if (o.roadDashes) for (var d = 3 + r() * 4; d < L; d += 4) strokes.push([P(d, 0, 9), P(Math.min(L, d + 2), 0, 9)]);
  if (o.lamps) for (d = 5 + r() * 6; d < L; d += 13 + r() * 5) {
    strokes.push([P(d, 0, 2.5), P(d, 5.2, 2.5)], [P(d, 5.2, 2.5), P(d, 5.2, 1.7)], [P(d, 5.2, 1.7), P(d, 4.8, 1.7)]);
    strokes.push([P(d - 0.25, 4.8, 1.7), P(d + 0.25, 4.8, 1.7)], [P(d - 0.25, 4.8, 1.7), P(d - 0.15, 4.4, 1.7)], [P(d + 0.25, 4.8, 1.7), P(d + 0.15, 4.4, 1.7)]);
  }
  function branch(d, h, ang, len, depth) {
    var d2 = d + Math.sin(ang) * len, h2 = h + Math.cos(ang) * len;
    strokes.push([P(d, h, 4.5), P(d2, h2, 4.5)]);
    if (depth > 0) { var k = 2 + (r() < 0.4 ? 1 : 0); for (var i = 0; i < k; i++) branch(d2, h2, ang + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.15), depth - 1); }
  }
  if (o.trees) for (d = 8 + r() * 8; d < L; d += 12 + r() * 10) if (r() < 0.7) { strokes.push([P(d, 0, 4.5), P(d, 2.2, 4.5)]); branch(d, 2.2, (r() - 0.5) * 0.3, 1.4 + r() * 0.6, 4); }
  return strokes;
}

/** A row of plain tall buildings on a plane 18 units behind the front row. */
function backRow(r, cam, S, L) {
  var out = [], off = -6, plane = { pt: function (d, h, e) { return S.pt(d, h, e - 18); } };
  while (off < L + 14) {
    var w = 8 + Math.floor(r() * 12), fl = 8 + Math.floor(r() * 14);
    var b = building(r, cam, plane, { off: off, width: w, floors: fl, floorH: 3, groundH: 0, bayW: 3, window: 'rect', door: false });
    out.push({ fills: b.fills, glows: b.glows, strokes: b.strokes });
    off += w + (r() < 0.4 ? 3 : 0);
  }
  return out;
}

/** The window family pool allowed by the flags; rect when every family is off. */
function windowPool(o) {
  var pool = [];
  if (o.winRect) pool.push('rect'); if (o.winArch) pool.push('arch'); if (o.winTall) pool.push('tall');
  if (o.winPaired) pool.push('paired'); if (o.winGrid) pool.push('grid');
  return pool.length ? pool : ['rect'];
}

/** Per-building choices drawn from the flags: which ornament, trim, roof, and extras this one gets. */
function buildingRecipe(r, o, off, width, floors, floorH, groundH) {
  var roof = 'flat';
  if (o.gables && r() < 0.3) roof = 'gable'; else if (o.mansards && r() < 0.3) roof = 'mansard';
  return {
    off: off, width: width, floors: floors, floorH: floorH, groundH: groundH, bayW: 2.4 + r() * 1.6, window: pick(r, windowPool(o)), door: true,
    rooftops: o.rooftops, roof: roof,
    balconies: o.balconies && r() < 0.5, awnings: o.awnings && r() < 0.5,
    brackets: o.brackets && r() < 0.5, quoins: o.quoins && r() < 0.35, rustication: o.rustication && r() < 0.4, keystones: o.keystones,
    architraves: o.architraves && r() < 0.5, lintels: o.lintels && r() < 0.5, shutters: o.shutters && r() < 0.4, pediments: o.pediments && r() < 0.35,
    stringCourses: o.stringCourses && r() < 0.6, dentils: o.dentils && r() < 0.5, pilasters: o.pilasters && r() < 0.4, transoms: o.transoms && r() < 0.6,
    parapetCaps: o.parapetCaps && r() < 0.7, fireEscape: o.fireEscapes && r() < 0.35
  };
}

/** The front row of one side: buildings and gaps, each tagged with its offset for sorting. */
function frontRow(r, cam, S, L, o) {
  var front = [], off = 0, i = 0;
  while (off < L) {
    var groundH = 3.6 + r() * 1.2;
    if (o.gaps && i > 0 && r() < 0.28) { var g = gap(r, cam, S, off, groundH); front.push({ strokes: g.strokes, off: off }); off += g.width; i++; continue; }
    var tower = o.towers && r() < (o.closeCamera ? 0.3 : 0.18), floors = tower ? (o.closeCamera ? 12 : 9) + Math.floor(r() * (o.closeCamera ? 8 : 5)) : 4 + Math.floor(r() * 8);
    var floorH = 2.8 + r() * 0.8, width = 10 + Math.floor(r() * 14);
    var base = buildingRecipe(r, o, off, width, floors, floorH, groundH), parts = [];
    if (o.setbacks && floors >= 6 && r() < 0.35) {
      var lower = 3 + Math.floor(r() * (floors - 4)), inset = width * (0.1 + r() * 0.12);
      var lo = Object.assign({}, base, { floors: lower, rooftops: false, roof: 'flat' });
      var hi = Object.assign({}, base, { off: off + inset, width: width - 2 * inset, floors: floors - lower, groundH: 0, door: false, h0: groundH + lower * floorH, awnings: false, rustication: false, transoms: false });
      parts.push(building(r, cam, S, hi)); parts.push(building(r, cam, S, lo));
    } else parts.push(building(r, cam, S, base));
    parts.forEach(function (bd) { front.push({ fills: bd.fills, glows: bd.glows, strokes: bd.strokes, off: off }); });
    off += width; i++;
  }
  front.push({ strokes: street(r, cam, S, L, o), off: -1 });
  return front;
}

/** Fit projected items into region R with a similarity: the corner ground lands at 30% across and
    92% down, the tallest stroke at 8% down. Strokes are clipped at the region's left edge. */
function fitToRegion(items, cornerPt, R) {
  var top = Infinity;
  items.forEach(function (it) { it.strokes.forEach(function (s) { top = Math.min(top, s[0][1], s[1][1]); }); });
  var scale = (R.h * 0.84) / Math.max(0.001, cornerPt[1] - top), ax = R.x + R.w * 0.3, ay = R.y + R.h * 0.92;
  function fitp(p) { return [ax + (p[0] - cornerPt[0]) * scale, ay + (p[1] - cornerPt[1]) * scale]; }
  function clip(st) {
    var out = [];
    st.forEach(function (s) {
      var a = fitp(s[0]), b = fitp(s[1]);
      if (a[0] < R.x && b[0] < R.x) return;
      if (a[0] >= R.x && b[0] >= R.x) { out.push([a, b]); return; }
      var t = (R.x - a[0]) / (b[0] - a[0]), m = [R.x, a[1] + (b[1] - a[1]) * t];
      out.push(a[0] >= R.x ? [a, m] : [m, b]);
    });
    return out;
  }
  return items.map(function (it) {
    return {
      fills: (it.fills || []).map(function (poly) { return poly.map(fitp); }),
      glows: (it.glows || []).map(function (gw) { return { poly: gw.poly.map(fitp), k: gw.k }; }),
      strokes: clip(it.strokes)
    };
  });
}

/** The street corner. r: generator. R: region {x, y, w, h}. opts: any CORNER_OPTIONS flags, plus the
    shorthands pitch and full. Returns items for renderTo, drawIn, or bounce. */
function corner4(r, R, opts) {
  var o = cornerOptions(opts), near = o.closeCamera;
  var A = near ? 9 : 14, B = near ? 9 : 14, eye = 1.7;
  if (o.randomCamera) { A += r() * 12; B += r() * 12; eye = r() < (near ? 0.7 : 0.85) ? 1.7 : 5 + r() * 9; } else { A += 6; B += 6; }
  var C = [-A, -B, eye], T = [8 + (o.randomCamera ? r() * 12 : 6), 5 + (o.randomCamera ? r() * 8 : 4), eye], pitch = o.pitch ? 0.18 + r() * 0.22 : 0;
  var cam = pinhole(C, T, pitch);
  var sides = [[side(false), 26 + r() * 20], [side(true), 44 + r() * 30]], items = [], front = [];
  if (o.backRow) sides.forEach(function (sd) { backRow(r, cam, sd[0], sd[1]).forEach(function (it) { items.push(it); }); });
  sides.forEach(function (sd) { frontRow(r, cam, sd[0], sd[1], o).forEach(function (it) { front.push(it); }); });
  front.sort(function (a, b) { return b.off - a.off; });
  front.forEach(function (it) { items.push(it); });
  return fitToRegion(items, cam([0, 0, 0]), R);
}

/** Friendlier name for the same generator. */
var streetCorner = corner4;

/* ---- skyline.js ---- */
/* The Wave Function Collapse skyline: socketed tiles collapsed into a consistent street of buildings. */

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
function skyline(r, R, opts) {
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

/* ---- truss.js ---- */
/* A bridge truss in elevation: Pratt or Warren web, double-line members, gusset joints, deck, piers. */

/** A stroke from (a, b) to (c, d). */
function L(a, b, c, d) { return [[a, b], [c, d]]; }

/** A member from a to b as one or two parallel lines offset by off. */
function member(a, b, off, double) {
  if (!double) return [[a, b]];
  var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * off, ny = dx / l * off;
  return [[[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]], [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny]]];
}

/** A gusset circle at a joint, as a ten-segment polyline. */
function joint(p) {
  var s = [], prev = null;
  for (var k = 0; k <= 10; k++) { var t = k / 10 * Math.PI * 2, q = [p[0] + 5 * Math.cos(t), p[1] + 5 * Math.sin(t)]; if (prev) s.push([prev, q]); prev = q; }
  return s;
}

/** The web members between top and bottom chords for n panels. Pratt has verticals with diagonals
    leaning to the centre; Warren is a run of triangles with no verticals. */
function web(x0, panel, yb, yt, n, pratt, off, dbl) {
  var out = [], mid = n / 2;
  for (var i = 1; i < n; i++) {
    var xb = x0 + i * panel;
    if (pratt) {
      out.push.apply(out, member([xb, yb], [xb, yt], off, dbl));
      var dir = i < mid ? 1 : -1; if (i !== mid) out.push.apply(out, member([xb, yb], [xb + dir * panel, yt], off, dbl));
    }
    else if (i % 2 === 1 && i + 1 < n) out.push.apply(out, member([xb, yt], [xb + panel, yb], off, dbl));
    if (!pratt && i % 2 === 0 && i + 1 < n) out.push.apply(out, member([xb, yb], [xb + panel, yt], off, dbl));
  }
  return out;
}

/** The truss. r: generator. R: region. opts: see TRUSS_OPTIONS. Returns items. */
function truss(r, R, opts) {
  var F = resolve('truss', opts), items = [], n = 6 + Math.floor(r() * 7);
  var pratt = F.pratt && F.warren ? r() < 0.5 : !!F.pratt || !F.warren;
  var x0 = R.x + R.w * 0.06, span = R.w * 0.88, panel = span / n, H = Math.min(R.h * 0.22, panel * 1.4);
  var yb = R.y + R.h * 0.62, yt = yb - H, off = 2.5, dbl = !!F.doubleLines;
  var chords = [];
  chords.push.apply(chords, member([x0, yb], [x0 + span, yb], off, dbl));
  chords.push.apply(chords, member([x0 + panel, yt], [x0 + span - panel, yt], off, dbl));
  chords.push.apply(chords, member([x0, yb], [x0 + panel, yt], off, dbl));
  chords.push.apply(chords, member([x0 + span, yb], [x0 + span - panel, yt], off, dbl));
  items.push({ strokes: chords });
  items.push({ strokes: web(x0, panel, yb, yt, n, pratt, off, dbl) });
  if (F.gussets) {
    var joints = [];
    for (var i = 0; i <= n; i++) { joints.push.apply(joints, joint([x0 + i * panel, yb])); if (i > 0 && i < n) joints.push.apply(joints, joint([x0 + i * panel, yt])); }
    items.push({ strokes: joints });
  }
  var gy = R.y + R.h * 0.88, ctx = [];
  if (F.deck) ctx.push(L(x0 - 20, yb + 10, x0 + span + 20, yb + 10));
  if (F.piers) [x0 + panel * 0.5, x0 + span - panel * 0.5].forEach(function (px) {
    ctx.push(L(px - 14, yb + 10, px - 14, gy), L(px + 14, yb + 10, px + 14, gy), L(px - 26, gy, px + 26, gy));
    for (var k = -22; k < 22; k += 8) ctx.push(L(px + k, gy, px + k + 6, gy + 8));
  });
  ctx.push(L(R.x, gy, R.x + R.w, gy));
  items.push({ strokes: ctx });
  return items;
}

/* ---- plan.js ---- */
/* A floor plan by recursive subdivision: rooms, walls with thickness, door swings, windows, a stair. */

/** A stroke from (a, b) to (c, d). */
function L(a, b, c, d) { return [[a, b], [c, d]]; }

/** Split a rectangle into rooms and partitions, recursively. */
function subdivide(r, x, y, w, h, depth, rooms, parts) {
  if (depth === 0 || (w < 110 && h < 110) || r() < 0.08 * (5 - depth)) { rooms.push({ x: x, y: y, w: w, h: h }); return; }
  var vertical = w > h ? r() < 0.75 : r() < 0.25;
  if (vertical && w < 140) vertical = false; if (!vertical && h < 140) vertical = true;
  var f = 0.35 + r() * 0.3;
  if (vertical) { var sx = x + w * f; parts.push({ x1: sx, y1: y, x2: sx, y2: y + h, v: true }); subdivide(r, x, y, sx - x, h, depth - 1, rooms, parts); subdivide(r, sx, y, x + w - sx, h, depth - 1, rooms, parts); }
  else { var sy = y + h * f; parts.push({ x1: x, y1: sy, x2: x + w, y2: sy, v: false }); subdivide(r, x, y, w, sy - y, depth - 1, rooms, parts); subdivide(r, x, sy, w, y + h - sy, depth - 1, rooms, parts); }
}

/** Hatch the outer wall thickness T around the rectangle (x0, y0, W, H). */
function poche(x0, y0, W, H, T) {
  var hatch = [], step = 7;
  for (var hx = x0 - T; hx < x0 + W + T; hx += step) { hatch.push(L(hx, y0 - T, Math.min(hx + T, x0 + W + T), y0 - T + Math.min(T, x0 + W + T - hx))); hatch.push(L(hx, y0 + H, Math.min(hx + T, x0 + W + T), y0 + H + Math.min(T, x0 + W + T - hx))); }
  for (var hy = y0 - T; hy < y0 + H + T; hy += step) { hatch.push(L(x0 - T, hy, x0 - T + Math.min(T, y0 + H + T - hy), Math.min(hy + T, y0 + H + T))); hatch.push(L(x0 + W, hy, x0 + W + Math.min(T, y0 + H + T - hy), Math.min(hy + T, y0 + H + T))); }
  return hatch;
}

/** A window opening in the outer wall for every room that touches it. */
function windows(rooms, x0, y0, W, H, T) {
  var wins = [];
  rooms.forEach(function (rm) {
    var cx = rm.x + rm.w / 2, cy = rm.y + rm.h / 2, ww = Math.min(40, rm.w * 0.4), wh = Math.min(40, rm.h * 0.4);
    if (Math.abs(rm.y - y0) < 1) wins.push(L(cx - ww / 2, y0 - T, cx - ww / 2, y0), L(cx + ww / 2, y0 - T, cx + ww / 2, y0), L(cx - ww / 2, y0 - T / 2, cx + ww / 2, y0 - T / 2));
    if (Math.abs(rm.y + rm.h - (y0 + H)) < 1) wins.push(L(cx - ww / 2, y0 + H, cx - ww / 2, y0 + H + T), L(cx + ww / 2, y0 + H, cx + ww / 2, y0 + H + T), L(cx - ww / 2, y0 + H + T / 2, cx + ww / 2, y0 + H + T / 2));
    if (Math.abs(rm.x - x0) < 1) wins.push(L(x0 - T, cy - wh / 2, x0, cy - wh / 2), L(x0 - T, cy + wh / 2, x0, cy + wh / 2), L(x0 - T / 2, cy - wh / 2, x0 - T / 2, cy + wh / 2));
    if (Math.abs(rm.x + rm.w - (x0 + W)) < 1) wins.push(L(x0 + W, cy - wh / 2, x0 + W + T, cy - wh / 2), L(x0 + W, cy + wh / 2, x0 + W + T, cy + wh / 2), L(x0 + W + T / 2, cy - wh / 2, x0 + W + T / 2, cy + wh / 2));
  });
  return wins;
}

/** One partition as a double line with an optional door opening and quarter-circle swing. */
function partition(r, p, t, withDoor) {
  var s = [], len = p.v ? p.y2 - p.y1 : p.x2 - p.x1, door = withDoor ? 26 : 0, at = len * (0.25 + r() * 0.5), d0 = at - door / 2, d1 = at + door / 2;
  if (!withDoor) { d0 = len; d1 = len; }
  if (p.v) {
    [-t / 2, t / 2].forEach(function (o) { s.push(L(p.x1 + o, p.y1, p.x1 + o, p.y1 + d0)); if (withDoor) s.push(L(p.x1 + o, p.y1 + d1, p.x1 + o, p.y2)); });
    if (withDoor) {
      s.push(L(p.x1 - t / 2, p.y1 + d0, p.x1 + t / 2, p.y1 + d0), L(p.x1 - t / 2, p.y1 + d1, p.x1 + t / 2, p.y1 + d1));
      var hx = p.x1 + t / 2, hy = p.y1 + d0, prev = null;
      s.push(L(hx, hy, hx + door, hy));
      for (var k = 0; k <= 8; k++) { var a = Math.PI / 2 * k / 8, q = [hx + door * Math.cos(a), hy + door * Math.sin(a)]; if (prev) s.push([prev, q]); prev = q; }
    }
  } else {
    [-t / 2, t / 2].forEach(function (o) { s.push(L(p.x1, p.y1 + o, p.x1 + d0, p.y1 + o)); if (withDoor) s.push(L(p.x1 + d1, p.y1 + o, p.x2, p.y1 + o)); });
    if (withDoor) {
      s.push(L(p.x1 + d0, p.y1 - t / 2, p.x1 + d0, p.y1 + t / 2), L(p.x1 + d1, p.y1 - t / 2, p.x1 + d1, p.y1 + t / 2));
      var hx2 = p.x1 + d0, hy2 = p.y1 + t / 2, prev2 = null;
      s.push(L(hx2, hy2, hx2, hy2 + door));
      for (k = 0; k <= 8; k++) { a = Math.PI / 2 * k / 8; q = [hx2 + door * Math.sin(a), hy2 + door * Math.cos(a)]; if (prev2) s.push([prev2, q]); prev2 = q; }
    }
  }
  return s;
}

/** A stair in the largest room: a rectangle of treads with a direction line. */
function stair(rooms) {
  var big = rooms.slice().sort(function (a, b) { return b.w * b.h - a.w * a.h; })[0];
  if (!big) return [];
  var s = [], sw = Math.min(80, big.w * 0.5), sh = Math.min(160, big.h * 0.7), sx = big.x + 16, sy = big.y + 16, steps = Math.max(4, Math.floor(sh / 12));
  s.push(L(sx, sy, sx + sw, sy), L(sx, sy, sx, sy + sh), L(sx + sw, sy, sx + sw, sy + sh), L(sx, sy + sh, sx + sw, sy + sh));
  for (var k = 1; k < steps; k++) s.push(L(sx, sy + sh * k / steps, sx + sw, sy + sh * k / steps));
  s.push(L(sx + sw / 2, sy + sh, sx + sw / 2, sy + 8));
  return s;
}

/** The floor plan. r: generator. R: region. opts: see PLAN_OPTIONS. Returns items. */
function plan(r, R, opts) {
  var F = resolve('plan', opts), items = [], x0 = R.x + R.w * 0.06, y0 = R.y + R.h * 0.1, W = R.w * 0.88, H = R.h * 0.78, t = 6, T = 10;
  var rooms = [], parts = [];
  subdivide(r, x0, y0, W, H, 5, rooms, parts);
  var outer = [L(x0, y0, x0 + W, y0), L(x0 + W, y0, x0 + W, y0 + H), L(x0 + W, y0 + H, x0, y0 + H), L(x0, y0 + H, x0, y0),
    L(x0 - T, y0 - T, x0 + W + T, y0 - T), L(x0 + W + T, y0 - T, x0 + W + T, y0 + H + T), L(x0 + W + T, y0 + H + T, x0 - T, y0 + H + T), L(x0 - T, y0 + H + T, x0 - T, y0 - T)];
  items.push({ strokes: F.poche ? outer.concat(poche(x0, y0, W, H, T)) : outer });
  if (F.windows) items.push({ strokes: windows(rooms, x0, y0, W, H, T) });
  parts.forEach(function (p) { items.push({ strokes: partition(r, p, t, !!F.doors) }); });
  if (F.stair) items.push({ strokes: stair(rooms) });
  return items;
}

/* ---- components.js ---- */
/* Web Components: <dmg-street-corner>, <dmg-massing>, <dmg-skyline>, <dmg-truss>, <dmg-plan>.
   Each element owns a canvas sized to its own box at device pixel ratio and draws the chosen
   generator into it. The page decides placement and size through CSS. Feature flags arrive as
   JSON in the `options` attribute and are validated against src/options.js. */

var STYLE = ':host{display:block;position:relative;min-height:240px}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}';

/** Night palette and glow defaults. */
var NIGHT = { page: '#0E0E10', color: '#A8AAB0', glow: '#F2D08A', glowProb: 0.6 };
var DAY = { page: '#FFFFFF', color: '#C4C6CB', glowProb: 0.35 };

/** Generators by element kind. Each takes (r, region, options) and returns items. */
var GENERATORS = { corner: corner4, massing: massing3, skyline: skyline, truss: truss, plan: plan };

/** Tag names by kind. */
var TAGS = { corner: 'dmg-street-corner', massing: 'dmg-massing', skyline: 'dmg-skyline', truss: 'dmg-truss', plan: 'dmg-plan' };

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
function snippetFor(el, kind) {
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
function defineComponents() {
  if (typeof customElements === 'undefined' || typeof HTMLElement === 'undefined') return false;
  Object.keys(TAGS).forEach(function (kind) { if (!customElements.get(TAGS[kind])) customElements.define(TAGS[kind], makeClass(kind)); });
  return true;
}

var ProceduralLines = { rng, hashSeed, clockSeed, pick, makeIso, facadePoint, pinhole, windowOf, facade, facade2, gapElement, OPTIONS, CORNER_OPTIONS, MASSING_OPTIONS, SKYLINE_OPTIONS, TRUSS_OPTIONS, PLAN_OPTIONS, defaults, resolve, diffFromDefaults, wfc, massing, painterOrder, hatchFace, boxDrawing, boxDrawing2, massing3, corner4, streetCorner, skyline, truss, plan, renderTo, totalLength, speedsFor, drawIn, bounce, reducedMotion, defineComponents, snippetFor, TAGS, NIGHT };
if (typeof module === 'object' && module.exports) module.exports = ProceduralLines;
if (global) global.ProceduralLines = ProceduralLines;
defineComponents();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
