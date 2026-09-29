/* Projections: axonometric, facade-plane two-point, a pinhole camera, and the similarity fit that
   places a projected drawing into a box without changing its perspective. */

/** Axonometric projection. ox, oy: screen origin. u: px per unit. deg: axis angle (30 = isometric). */
export function makeIso(ox, oy, u, deg) {
  var a = (deg || 30) * Math.PI / 180, C = Math.cos(a), S = Math.sin(a);
  return function (x, y, z) { return [ox + (x - y) * C * u, oy + (x + y) * S * u - z * u]; };
}

/** Two-point perspective for a point on a vertical facade plane.
    d: distance along the facade from the corner. h: height. vpx: vanishing point x.
    cx, groundY: the corner on screen. hy: horizon y. D0: recession rate. scale: px per unit at the corner. */
export function facadePoint(d, h, vpx, cx, groundY, hy, D0, scale) {
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
    Returns a function from world [x, y, z] to screen [x, y]; fit the result with a 2D similarity.
    The function also carries `.C` (the camera position) for visibility tests. */
export function pinhole(C, T, pitch) {
  var f = norm([T[0] - C[0], T[1] - C[1], (pitch || 0) * 20]);
  var rt = norm(cross(f, [0, 0, 1])), up = cross(rt, f);
  function cam(P) {
    var v = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], z = Math.max(0.05, dot(v, f));
    return [dot(v, rt) / z, -dot(v, up) / z];
  }
  cam.C = C; cam.f = f;
  return cam;
}

/** True when a face with outward normal n at point p faces the camera at C. */
export function facesCamera(n, p, C) {
  return dot(n, [C[0] - p[0], C[1] - p[1], C[2] - p[2]]) > 0;
}

/** Fit projected items into region R with a uniform scale and a translation, which preserves
    perspective. The drawing's bounding box is scaled to fit R with the given padding fractions,
    centred horizontally and aligned to the bottom (its lowest stroke lands at R's bottom minus
    padBottom). Items must be {fills, glows, strokes} in projected units. Returns fitted items. */
export function fitSimilarity(items, R, pad) {
  pad = pad || {};
  var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  items.forEach(function (it) { it.strokes.forEach(function (s) { s.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); }); });
  if (!isFinite(x0)) return items;
  var padX = pad.x == null ? 0.04 : pad.x, padTop = pad.top == null ? 0.06 : pad.top, padBottom = pad.bottom == null ? 0.08 : pad.bottom;
  var s = Math.min(R.w * (1 - 2 * padX) / Math.max(1e-6, x1 - x0), R.h * (1 - padTop - padBottom) / Math.max(1e-6, y1 - y0));
  var ox = R.x + (R.w - (x1 - x0) * s) / 2 - x0 * s, oy = R.y + R.h * (1 - padBottom) - y1 * s;
  function fp(p) { return [ox + p[0] * s, oy + p[1] * s]; }
  return items.map(function (it) {
    return {
      fills: (it.fills || []).map(function (poly) { return poly.map(fp); }),
      glows: (it.glows || []).map(function (g) { return { poly: g.poly.map(fp), k: g.k }; }),
      strokes: it.strokes.map(function (st) { return [fp(st[0]), fp(st[1])]; })
    };
  });
}
