/* Axonometric massing: box clusters, decorated box drawings, and the fitted massing scene.
   Every feature is a flag in MASSING_OPTIONS (src/options.js). */
import { makeIso, pinhole } from './camera.js';
import { resolve } from './options.js';

/** A seeded cluster of stacked boxes on a grid, sorted far to near for painter's order.
    opts: count, grid. Returns [{x, y, z, dx, dy, dz}]. */
export function massing(r, opts) {
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
export function painterOrder(a, b) {
  return (a.x + a.dx / 2 + a.y + a.dy / 2 + a.z + a.dz / 2) - (b.x + b.dx / 2 + b.y + b.dy / 2 + b.z + b.dz / 2);
}

/** Hatch a parallelogram face with origin P and edge vectors U, V: lines parallel to V spaced along U. */
export function hatchFace(P, U, V, spacing, out) {
  var L = Math.hypot(U[0], U[1]);
  for (var k = spacing; k < L; k += spacing) { var a = [P[0] + U[0] * k / L, P[1] + U[1] * k / L]; out.push([a, [a[0] + V[0], a[1] + V[1]]]); }
}

/** Visible faces of a box plus hatch lines on the +x face. iso: projection. Returns {fills, strokes}. */
export function boxDrawing(b, iso, hatchSpacing) {
  return boxDrawing2(b, iso, 1, { hatch: hatchSpacing });
}

/** The lift applied to a box in an exploded view (zero otherwise). */
function lift(b) { return b.lift || 0; }

/** The visible face polygons of a box: +x face, +y face, and the top, or the underside when a
    perspective camera (F.cam) stands below the box, or neither when it stands between. */
function faces(b, iso, F) {
  var X = b.x + b.dx, Y = b.y + b.dy, z0 = b.z + lift(b), Z = z0 + b.dz, cz = F && F.cam ? F.cam.C[2] : Infinity;
  var out = {
    fx: [iso(X, b.y, z0), iso(X, Y, z0), iso(X, Y, Z), iso(X, b.y, Z)],
    fy: [iso(b.x, Y, z0), iso(X, Y, z0), iso(X, Y, Z), iso(b.x, Y, Z)],
    topVisible: cz > Z, bottomVisible: cz < z0
  };
  if (out.topVisible) out.top = [iso(b.x, b.y, Z), iso(X, b.y, Z), iso(X, Y, Z), iso(b.x, Y, Z)];
  if (out.bottomVisible) out.bottom = [iso(b.x, b.y, z0), iso(X, b.y, z0), iso(X, Y, z0), iso(b.x, Y, z0)];
  return out;
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
export function boxDrawing2(b, iso, u, F) {
  F = F || {};
  var fc = faces(b, iso, F), s = [], glows = [], fills = [fc.fx, fc.fy];
  if (b.gable && fc.topVisible) fills = fills.concat(gableRoof(b, iso, s));
  else if (fc.topVisible) { fills.push(fc.top); quad(fc.top, s); }
  if (fc.bottomVisible) { fills.push(fc.bottom); quad(fc.bottom, s); }
  quad(fc.fx, s); quad(fc.fy, s);
  if (b.tower) towerLines(b, iso, s);
  if (b.terrace && !b.gable && fc.topVisible) terraceLines(b, iso, s);
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
export function massing3(r, R, opts) {
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
  var deg = F.randomAngle ? 20 + r() * 20 : 30, raw = makeIso(0, 0, 1, deg), cam = null;
  if (F.perspective === 2 || F.perspective === 3) {
    var low = F.perspective === 3, Cc = [g + 6 + r() * 8, g + 6 + r() * 8, low ? 1.5 : 6 + r() * 10];
    cam = pinhole(Cc, [g * 0.45, g * 0.45, Cc[2]], low ? 0.35 + r() * 0.3 : 0);
    raw = function (x, y, z) { return cam([x, y, z]); };
  }
  var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  var pad = F.ground ? 1.2 : 0;
  boxes.concat([{ x: -pad, y: -pad, z: 0, dx: g + 2 * pad, dy: g + 2 * pad, dz: 0 }]).forEach(function (b) {
    for (var c = 0; c < 8; c++) {
      var p = raw(b.x + (c & 1 ? b.dx : 0), b.y + (c & 2 ? b.dy : 0), b.z + lift(b) + (c & 4 ? b.dz + (b.gable ? b.dy * 0.45 : 0.3) : 0));
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
    }
  });
  var u = Math.min(R.w * 0.92 / (x1 - x0), R.h * 0.88 / (y1 - y0));
  var ox = R.x + (R.w - (x1 - x0) * u) / 2 - x0 * u, oy = R.y + R.h * 0.94 - y1 * u;
  var iso = cam ? function (x, y, z) { var p = raw(x, y, z); return [ox + p[0] * u, oy + p[1] * u]; } : makeIso(ox, oy, u, deg), items = [];
  if (F.ground) items.push({ strokes: groundContext(r, boxes, g, iso) });
  var flags = { hatchlight: F.hatchlight, r: r, cam: cam };
  boxes.forEach(function (b) { items.push(boxDrawing2(b, iso, u, flags)); });
  return items;
}
