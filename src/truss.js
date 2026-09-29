/* A bridge truss in elevation: Pratt or Warren web, double-line members, gusset joints, deck, piers. */
import { resolve } from './options.js';

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
export function truss(r, R, opts) {
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
