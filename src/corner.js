/* The street corner: a 3D street seen through a pinhole camera, fitted to a region.
   Every feature is a flag in CORNER_OPTIONS (src/options.js). The default recipe is
   split-grammar facades with window families, rooftops, gaps, ornament, and the street in
   front. The legacy shorthands `full` (the crowded recipe) and `pitch` still work. */
import { pick } from './random.js';
import { pinhole } from './camera.js';
import { windowOf } from './grammar.js';
import { resolve } from './options.js';
import * as mw from './millwork.js';

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
export function corner4(r, R, opts) {
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
export var streetCorner = corner4;
