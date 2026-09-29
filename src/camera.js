/* Projections: axonometric, facade-plane two-point, and a pinhole camera. */

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
    Returns a function from world [x, y, z] to screen [x, y]; fit the result with a 2D similarity. */
export function pinhole(C, T, pitch) {
  var f = norm([T[0] - C[0], T[1] - C[1], (pitch || 0) * 20]);
  var rt = norm(cross(f, [0, 0, 1])), up = cross(rt, f);
  return function (P) {
    var v = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], z = Math.max(0.05, dot(v, f));
    return [dot(v, rt) / z, -dot(v, up) / z];
  };
}
