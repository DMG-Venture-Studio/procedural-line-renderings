/* A floor plan by recursive subdivision: rooms, walls with thickness, door swings, windows, a stair. */
import { resolve } from './options.js';

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
export function plan(r, R, opts) {
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
