/* The skyline: a 3D city block of towers rendered through the pinhole camera. Lots on a grid (or
   on both sides of an avenue for one-point perspective) each carry a tower built from stacked boxes
   with setbacks and a crown, or a low podium. Every visible face is filled in page colour far to
   near for hidden-line removal and carries floor lines and mullions, which is what makes a skyline
   read as glazing in ink. Every feature is a flag in SKYLINE_OPTIONS; `perspective` is 1, 2 or 3. */
import { pick } from './random.js';
import { pinhole, fitSimilarity, facesCamera } from './camera.js';
import { resolve } from './options.js';

var FLOOR = 3.4;

/** Lot layout. One-point: two columns of lots on each side of an avenue running along +y.
    Two- and three-point: a square grid of lots with streets between. Returns [{x, y, w, d}]. */
function layout(r, F, P) {
  var lots = [], pitch = F.dense ? 13 : 16, lot = pitch - 4;
  if (P === 1) {
    var half = 9, cols = F.dense ? 4 : 3;
    [-1, 1].forEach(function (s) {
      for (var c = 0; c < cols; c++) for (var y = 6; y < 150; y += pitch) {
        var w = lot - r() * 3, d = lot - r() * 3, x0 = s > 0 ? half + c * pitch : -half - c * pitch - w;
        lots.push({ x: x0, y: y, w: w, d: d });
      }
    });
    return lots;
  }
  var n = F.dense ? 9 : 7;
  for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
    var w2 = lot - r() * 3, d2 = lot - r() * 3;
    lots.push({ x: i * pitch + r() * (lot - w2), y: j * pitch + r() * (lot - d2), w: w2, d: d2 });
  }
  return lots;
}

/** Stacked boxes for one lot: a podium, or a tower with setback tiers and a crown type.
    Boxes are {x, y, z, dx, dy, dz, glass}. Returns {boxes, crown, top} where top is the last tier. */
function tower(r, F, lot) {
  var boxes = [], inset = 1, x = lot.x + inset, y = lot.y + inset, w = lot.w - 2 * inset, d = lot.d - 2 * inset, glass = r() < 0.5;
  if (F.podiums && r() < 0.3) {
    var ph = FLOOR * (2 + Math.floor(r() * 4));
    boxes.push({ x: lot.x + 0.3, y: lot.y + 0.3, z: 0, dx: lot.w - 0.6, dy: lot.d - 0.6, dz: ph, glass: false });
    return { boxes: boxes, crown: 'flat', top: boxes[0] };
  }
  var total = FLOOR * (8 + Math.floor(r() * 23)), z = 0, tiers = F.setbacks ? 1 + Math.floor(r() * 3) : 1;
  for (var t = 0; t < tiers; t++) {
    var dz = t === tiers - 1 ? total - z : Math.round((total - z) * (0.45 + r() * 0.3) / FLOOR) * FLOOR;
    if (dz < FLOOR) dz = FLOOR;
    boxes.push({ x: x, y: y, z: z, dx: w, dy: d, dz: dz, glass: glass });
    z += dz;
    var s = 0.6 + r() * 1.4; x += s; y += s; w -= 2 * s; d -= 2 * s;
    if (w < 3 || d < 3) break;
  }
  var pool = ['flat'];
  if (total > 35) { if (F.spires) pool.push('spire'); if (F.domes) pool.push('dome'); if (F.masts) pool.push('mast', 'mast'); if (F.crowns) pool.push('crown', 'crown'); }
  return { boxes: boxes, crown: pick(r, pool), top: boxes[boxes.length - 1] };
}

/** Push the four edges of a projected quad as strokes. */
function skyQuad(p, s) { for (var i = 0; i < 4; i++) s.push([p[i], p[(i + 1) % 4]]); }

/** The visible faces of a box for camera C, each as {poly, a, b, up} where a, b are the world
    endpoints of the face's bottom edge and up is its height, for floor lines and mullions. */
function visibleFaces(b, cam) {
  var C = cam.C, X = b.x + b.dx, Y = b.y + b.dy, Z = b.z + b.dz, out = [];
  function face(a, c, n, p) { if (facesCamera(n, p, C)) out.push({ a: a, b: c, up: b.dz, poly: [cam([a[0], a[1], b.z]), cam([c[0], c[1], b.z]), cam([c[0], c[1], Z]), cam([a[0], a[1], Z])] }); }
  face([b.x, b.y], [X, b.y], [0, -1, 0], [b.x, b.y, b.z]);
  face([X, b.y], [X, Y], [1, 0, 0], [X, b.y, b.z]);
  face([X, Y], [b.x, Y], [0, 1, 0], [X, Y, b.z]);
  face([b.x, Y], [b.x, b.y], [-1, 0, 0], [b.x, Y, b.z]);
  if (C[2] > Z) out.push({ top: true, poly: [cam([b.x, b.y, Z]), cam([X, b.y, Z]), cam([X, Y, Z]), cam([b.x, Y, Z])] });
  return out;
}

/** One box as an item: page fills for every visible face, outlines, floor lines, mullions, and a
    sparse set of window-cell glow polygons on near boxes. */
function boxItem(r, cam, b, F, near) {
  var it = { fills: [], glows: [], strokes: [] };
  visibleFaces(b, cam).forEach(function (f) {
    it.fills.push(f.poly); skyQuad(f.poly, it.strokes);
    if (f.top) return;
    var len = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]);
    function W(u, h) { return cam([f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u, b.z + h]); }
    if (F.floorLines) for (var h = FLOOR; h < b.dz - 0.1; h += FLOOR) { it.strokes.push([W(0, h), W(1, h)]); if (!b.glass) it.strokes.push([W(0, h + 0.6), W(1, h + 0.6)]); }
    var step = b.glass ? 0.9 : 2.0;
    if (F.mullions) for (var u = step; u < len - 0.1; u += step) it.strokes.push([W(u / len, 0), W(u / len, b.dz)]);
    if (near) for (h = 0; h < b.dz - 0.1; h += FLOOR) for (u = 0; u < len - step; u += step) if (r() < 0.14) {
      var u0 = (u + step * 0.15) / len, u1 = (u + step * 0.85) / len, h0 = h + FLOOR * 0.25, h1 = h + FLOOR * 0.8;
      it.glows.push({ poly: [W(u0, h0), W(u1, h0), W(u1, h1), W(u0, h1)], k: r() });
    }
  });
  return it;
}

/** A crown on the top tier: spire, dome, mast, or a columned cap. Returns strokes (and cap boxes). */
function crown(r, cam, kind, top, extraBoxes) {
  var s = [], cx = top.x + top.dx / 2, cy = top.y + top.dy / 2, Z = top.z + top.dz, rr = Math.min(top.dx, top.dy) / 2;
  if (kind === 'spire') {
    var apex = cam([cx, cy, Z + Math.max(top.dx, top.dy) * 1.3]);
    [[top.x, top.y], [top.x + top.dx, top.y], [top.x + top.dx, top.y + top.dy], [top.x, top.y + top.dy]].forEach(function (c) { s.push([cam([c[0], c[1], Z]), apex]); });
    s.push([cam([cx, cy, Z + Math.max(top.dx, top.dy) * 1.3]), cam([cx, cy, Z + Math.max(top.dx, top.dy) * 1.3 + 3])]);
  } else if (kind === 'dome') {
    for (var k = 1; k <= 3; k++) {
      var t = k / 4 * Math.PI / 2, rad = rr * Math.cos(t), h = Z + rr * Math.sin(t), prev = null;
      for (var i = 0; i <= 16; i++) { var a = i / 16 * Math.PI * 2, p = cam([cx + rad * Math.cos(a), cy + rad * Math.sin(a), h]); if (prev) s.push([prev, p]); prev = p; }
    }
    [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(function (dir) {
      var q = null;
      for (i = 0; i <= 8; i++) { t = i / 8 * Math.PI / 2; p = cam([cx + dir[0] * rr * Math.cos(t), cy + dir[1] * rr * Math.cos(t), Z + rr * Math.sin(t)]); if (q) s.push([q, p]); q = p; }
    });
    s.push([cam([cx, cy, Z + rr]), cam([cx, cy, Z + rr + 2.5])]);
  } else if (kind === 'mast') {
    var top2 = Z + 6 + r() * 8;
    s.push([cam([cx, cy, Z]), cam([cx, cy, top2])]);
    for (h = Z + 2; h < top2; h += 2.5) s.push([cam([cx - 0.8, cy, h]), cam([cx + 0.8, cy, h])], [cam([cx, cy - 0.8, h]), cam([cx, cy + 0.8, h])]);
  } else if (kind === 'crown') {
    var n = 8 + Math.floor(r() * 6), ins = 0.5;
    for (i = 0; i < n; i++) {
      var u = i / n, px, py;
      if (u < 0.25) { px = top.x + ins + (top.dx - 2 * ins) * u * 4; py = top.y + ins; }
      else if (u < 0.5) { px = top.x + top.dx - ins; py = top.y + ins + (top.dy - 2 * ins) * (u - 0.25) * 4; }
      else if (u < 0.75) { px = top.x + top.dx - ins - (top.dx - 2 * ins) * (u - 0.5) * 4; py = top.y + top.dy - ins; }
      else { px = top.x + ins; py = top.y + top.dy - ins - (top.dy - 2 * ins) * (u - 0.75) * 4; }
      s.push([cam([px, py, Z]), cam([px, py, Z + 3])]);
    }
    extraBoxes.push({ x: top.x + ins - 0.2, y: top.y + ins - 0.2, z: Z + 3, dx: top.dx - 2 * ins + 0.4, dy: top.dy - 2 * ins + 0.4, dz: 0.7, glass: false });
  }
  return s;
}

/** Kerbs and lane dashes: along the avenue for one-point, along the grid streets otherwise. */
function streets(r, cam, lots, P, F) {
  var s = [];
  function L(a, b) { s.push([cam(a), cam(b)]); }
  if (P === 1) {
    L([-9, 0, 0], [-9, 150, 0]); L([9, 0, 0], [9, 150, 0]); L([-9.4, 0, 0], [-9.4, 150, 0]); L([9.4, 0, 0], [9.4, 150, 0]);
    for (var y = 2; y < 150; y += 6) L([0, y, 0], [0, y + 3, 0]);
    var pitch = F.dense ? 13 : 16;
    for (y = 6 - 2; y < 150; y += pitch) { L([-40, y, 0], [-9, y, 0]); L([9, y, 0], [40, y, 0]); }
    return s;
  }
  var ext = (F.dense ? 9 : 7) * (F.dense ? 13 : 16), p2 = F.dense ? 13 : 16;
  for (var k = 0; k <= (F.dense ? 9 : 7); k++) { var g = k * p2 - 2; L([g, -2, 0], [g, ext, 0]); L([-2, g, 0], [ext, g, 0]); }
  return s;
}

/** The camera for a perspective mode: one-point on the avenue axis, two-point from a corner
    outside the block, three-point at street level pitched up. */
function skylineCamera(r, P, F) {
  var ext = (F.dense ? 9 : 7) * (F.dense ? 13 : 16);
  if (P === 1) { var eye = r() < 0.3 ? 8 + r() * 6 : 1.7; return pinhole([(r() - 0.5) * 3, -14 - r() * 10, eye], [0, 70, eye], 0); }
  if (P === 3) { var C3 = [-4 - r() * 5, -4 - r() * 5, 1.7]; return pinhole(C3, [ext * 0.35, ext * 0.35, 1.7], 0.5 + r() * 0.4); }
  var C2 = [-22 - r() * 14, -22 - r() * 14, 5 + r() * 12];
  return pinhole(C2, [ext * 0.4, ext * 0.4, C2[2]], 0);
}

/** The skyline. r: generator. R: region. opts: see SKYLINE_OPTIONS and `perspective`. Returns items. */
export function skyline(r, R, opts) {
  var F = resolve('skyline', opts), P = F.perspective, cam = skylineCamera(r, P, F), lots = layout(r, F, P);
  var boxes = [], crowns = [], C = cam.C;
  lots.forEach(function (lot) {
    var t = tower(r, F, lot);
    t.boxes.forEach(function (b) { boxes.push(b); });
    if (t.crown !== 'flat') crowns.push({ kind: t.crown, top: t.top });
  });
  var extra = [], crownStrokes = [];
  crowns.forEach(function (c) { crownStrokes = crownStrokes.concat(crown(r, cam, c.kind, c.top, extra)); });
  extra.forEach(function (b) { boxes.push(b); });
  function dist(b) { return Math.hypot(b.x + b.dx / 2 - C[0], b.y + b.dy / 2 - C[1]) - b.z * 0.01; }
  boxes.sort(function (a, b) { return dist(b) - dist(a); });
  var nearCount = Math.min(boxes.length, 18), items = [];
  if (F.street) items.push({ strokes: streets(r, cam, lots, P, F) });
  boxes.forEach(function (b, i) { items.push(boxItem(r, cam, b, F, i >= boxes.length - nearCount)); });
  items.push({ strokes: crownStrokes });
  return fitSimilarity(items, R, { x: 0.02, top: 0.06, bottom: 0.08 });
}
