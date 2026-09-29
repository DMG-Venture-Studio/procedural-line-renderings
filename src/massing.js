/* Axonometric massing: box clusters, decorated box drawings, and the fitted massing scene. */
import { makeIso } from './camera.js';

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

/** The three visible face polygons of a box: top, +x face, +y face. */
function faces(b, iso) {
  var X = b.x + b.dx, Y = b.y + b.dy, Z = b.z + b.dz;
  return {
    top: [iso(b.x, b.y, Z), iso(X, b.y, Z), iso(X, Y, Z), iso(b.x, Y, Z)],
    fx: [iso(X, b.y, b.z), iso(X, Y, b.z), iso(X, Y, Z), iso(X, b.y, Z)],
    fy: [iso(b.x, Y, b.z), iso(X, Y, b.z), iso(X, Y, Z), iso(b.x, Y, Z)]
  };
}

/** Floor lines and mullions on a tower's two visible faces. */
function towerLines(b, iso, s) {
  var X = b.x + b.dx, Y = b.y + b.dy, Z = b.z + b.dz;
  for (var k = 1; k < b.dz; k++) { s.push([iso(X, b.y, b.z + k), iso(X, Y, b.z + k)]); s.push([iso(b.x, Y, b.z + k), iso(X, Y, b.z + k)]); }
  for (var m = 0.5; m < b.dy; m += 0.5) s.push([iso(X, b.y + m, b.z), iso(X, b.y + m, Z)]);
  for (m = 0.5; m < b.dx; m += 0.5) s.push([iso(b.x + m, Y, b.z), iso(b.x + m, Y, Z)]);
}

/** Railing ticks along the exposed roof edges of a terrace, plus a stair on request. */
function terraceLines(b, iso, s) {
  var X = b.x + b.dx, Y = b.y + b.dy, Z = b.z + b.dz, rail = 0.18;
  for (var t = 0; t <= b.dy; t += 0.3) s.push([iso(X, b.y + t, Z), iso(X, b.y + t, Z + rail)]);
  for (t = 0; t <= b.dx; t += 0.3) s.push([iso(b.x + t, Y, Z), iso(b.x + t, Y, Z + rail)]);
  s.push([iso(X, b.y, Z + rail), iso(X, Y, Z + rail)]); s.push([iso(b.x, Y, Z + rail), iso(X, Y, Z + rail)]);
  if (b.stair) for (var k = 0; k < 5; k++) s.push([iso(b.x + 0.2, b.y + 0.2 + k * 0.15, Z), iso(b.x + 0.8, b.y + 0.2 + k * 0.15, Z)]);
}

/** Decorated box drawing: outlines, tower or terrace detail, and hatching.
    F.hatchlight gives three weights (top blank, +x single, +y cross); otherwise the +x face is hatched. */
export function boxDrawing2(b, iso, u, F) {
  F = F || {};
  var fc = faces(b, iso), s = [];
  [fc.top, fc.fx, fc.fy].forEach(function (p) { for (var i = 0; i < 4; i++) s.push([p[i], p[(i + 1) % 4]]); });
  if (b.tower) towerLines(b, iso, s);
  if (b.terrace) terraceLines(b, iso, s);
  var Px = fc.fx[0], Ux = [fc.fx[3][0] - Px[0], fc.fx[3][1] - Px[1]], Vx = [fc.fx[1][0] - Px[0], fc.fx[1][1] - Px[1]];
  if (!b.tower) {
    if (F.hatchlight) {
      hatchFace(Px, Ux, Vx, 6, s);
      var Py = fc.fy[0], Uy = [fc.fy[3][0] - Py[0], fc.fy[3][1] - Py[1]], Vy = [fc.fy[1][0] - Py[0], fc.fy[1][1] - Py[1]];
      hatchFace(Py, Uy, Vy, 5, s); hatchFace(Py, Vy, Uy, 5, s);
    } else if (F.hatch !== 0) hatchFace(Px, Ux, Vx, F.hatch || 6, s);
  }
  return { fills: [fc.top, fc.fx, fc.fy], strokes: s };
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

/** The massing scene: terraces and/or towers with the light study, generated in unit space,
    measured, and fitted to region R = {x, y, w, h}. F: terraces, towers, hatchlight. Returns items. */
export function massing3(r, R, F) {
  F = F || {};
  var boxes = [], g = 8;
  function baseAt(x, y, dx, dy) { var z = 0; boxes.forEach(function (b) { if (x < b.x + b.dx && x + dx > b.x && y < b.y + b.dy && y + dy > b.y) z = Math.max(z, b.z + b.dz); }); return z; }
  if (F.terraces) terraceStacks(r, boxes, baseAt); else boxes = massing(r, { count: 14, grid: g });
  if (F.towers) {
    var n = 2 + Math.floor(r() * 3);
    for (var i = 0; i < n; i++) {
      var tx = Math.floor(r() * g), ty = Math.floor(r() * g), tdx = 1 + (r() < 0.3 ? 1 : 0), tdy = 1 + (r() < 0.3 ? 1 : 0);
      boxes.push({ x: tx, y: ty, z: baseAt(tx, ty, tdx, tdy), dx: tdx, dy: tdy, dz: 8 + Math.floor(r() * 9), tower: true });
    }
  }
  boxes.sort(painterOrder);
  var raw = makeIso(0, 0, 1, 30), x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  boxes.forEach(function (b) {
    for (var c = 0; c < 8; c++) {
      var p = raw(b.x + (c & 1 ? b.dx : 0), b.y + (c & 2 ? b.dy : 0), b.z + (c & 4 ? b.dz + 0.3 : 0));
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
    }
  });
  var u = Math.min(R.w * 0.92 / (x1 - x0), R.h * 0.88 / (y1 - y0));
  var ox = R.x + (R.w - (x1 - x0) * u) / 2 - x0 * u, oy = R.y + R.h * 0.94 - y1 * u;
  var iso = makeIso(ox, oy, u, 30);
  return boxes.map(function (b) { return boxDrawing2(b, iso, u, F); });
}
