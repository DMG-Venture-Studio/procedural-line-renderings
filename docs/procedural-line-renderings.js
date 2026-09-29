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
   A drawing is a list of items {fills: [polygon], strokes: [[p, q], ...]} in draw order. */

/** True when the viewer asked for reduced motion (false outside a browser). */
function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Draw items up to px of total stroke length. Clears first. Each item's page-colour fills
    appear as soon as that item starts, which is what removes hidden lines. */
function renderTo(ctx, items, px, opts) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineWidth = 1; ctx.strokeStyle = opts.color || '#C4C6CB'; ctx.fillStyle = opts.page || '#FFFFFF'; ctx.lineCap = 'round';
  var left = px;
  for (var i = 0; i < items.length && left > 0; i++) {
    var it = items[i];
    (it.fills || []).forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (var k = 1; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]); ctx.closePath(); ctx.fill(); });
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

/** Draw in once and stop. opts: color, page, pxPerSecond, instant. Returns a stop function. */
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
/* Axonometric massing: box clusters, decorated box drawings, and the fitted massing scene. */

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
function boxDrawing2(b, iso, u, F) {
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
function massing3(r, R, F) {
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

/* ---- corner.js ---- */
/* The street corner: a 3D street seen through a pinhole camera, fitted to a region.
   Default recipe: split-grammar facades with window families and rooftops, gaps in the street
   wall, ornament, and the street in front (kerb, lamps, trees). opts.full adds a back row,
   balconies, awnings, setbacks and a closer camera. opts.pitch tilts the camera up (three-point). */

/** A side of the street: pt(d, h, e) -> world, e outward from the facade toward the camera. */
function side(isRight) {
  return { pt: isRight ? function (d, h, e) { return [d, -e, h]; } : function (d, h, e) { return [-e, d, h]; } };
}

/** Ornament on a facade: cornice brackets, rustication joints, alternating quoins. */
function ornament(o, W, H, gh, fh, line, rect) {
  if (o.brackets) for (var d = 0.4; d < W; d += 0.6) line(d, H - 0.3, d, H - 0.6, 0);
  if (o.rustication && gh > 0) for (var hh = 0.6; hh < gh; hh += 0.6) line(0, hh, W, hh, 0);
  if (o.quoins) for (var q = gh; q < H - 0.6; q += fh / 2) {
    var qw = (Math.round(q / (fh / 2)) % 2) ? 0.45 : 0.7;
    rect(0, q, qw, q + fh / 2, 0); rect(W - qw, q, W, q + fh / 2, 0);
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
function rooftops(r, W, H, line, rect) {
  var n = Math.floor(r() * 3.4), used = 1;
  for (var i = 0; i < n && used < W - 4; i++) {
    var d = used + r() * 1.5, kind = pick(r, ['chimney', 'tank', 'bulkhead', 'antenna', 'billboard']), e = -(1 + r() * 3);
    if (kind === 'chimney') { rect(d, H, d + 0.8, H + 1.3, e); used = d + 1.2; }
    else if (kind === 'tank') { line(d, H, d, H + 1.2, e); line(d + 1.6, H, d + 1.6, H + 1.2, e); rect(d - 0.1, H + 1.2, d + 1.7, H + 2.8, e); line(d - 0.1, H + 2.8, d + 0.8, H + 3.3, e); line(d + 0.8, H + 3.3, d + 1.7, H + 2.8, e); used = d + 2.2; }
    else if (kind === 'bulkhead') { rect(d, H, d + 2, H + 1.2, e); rect(d + 0.7, H, d + 1.3, H + 0.9, e); used = d + 2.5; }
    else if (kind === 'antenna') { line(d, H, d, H + 2.6, e); line(d - 0.4, H + 1.8, d + 0.4, H + 1.8, e); line(d - 0.3, H + 2.2, d + 0.3, H + 2.2, e); used = d + 0.8; }
    else { line(d, H, d, H + 1, e); line(d + 4, H, d + 4, H + 1, e); rect(d, H + 1, d + 4, H + 3, e); used = d + 4.5; }
  }
}

/** One building on a side, in 3D. Returns {fills, strokes}. The fill is the facade quad for hidden lines. */
function building(r, cam, S, o) {
  var strokes = [], fills = [], W = o.width, gh = o.groundH, h0 = o.h0 || 0, F = o.floors, fh = o.floorH, H = gh + F * fh;
  function P(d, h, e) { return cam(S.pt(o.off + d, h0 + h, e || 0)); }
  function line(d0, hA, d1, h1, e0, e1) { strokes.push([P(d0, hA, e0), P(d1, h1, e1 == null ? e0 : e1)]); }
  function rect(d0, hA, d1, h1, e) { line(d0, hA, d1, hA, e); line(d1, hA, d1, h1, e); line(d1, h1, d0, h1, e); line(d0, h1, d0, hA, e); }
  var win = windowOf(o.window, line, function (a, b, c, d) { rect(a, b, c, d, 0); });
  fills.push([P(0, 0, 0), P(W, 0, 0), P(W, H, 0), P(0, H, 0)]);
  rect(0, 0, W, H, 0);
  if (gh > 0) line(0, gh, W, gh, 0);
  line(0, H - 0.3, W, H - 0.3, 0);
  ornament(o, W, H, gh, fh, line, rect);
  var bays = Math.max(1, Math.floor(W / o.bayW)), rb = W / bays, door = o.door ? Math.floor(r() * bays) : -1;
  for (var fl = 0; fl < F; fl++) {
    var base = gh + fl * fh, balconyFloor = o.balconies && r() < 0.4;
    for (var b = 0; b < bays; b++) {
      var d0 = b * rb + rb * 0.25, d1 = (b + 1) * rb - rb * 0.25;
      win(d0, base + fh * 0.25, d1, base + fh * 0.8);
      if (o.window === 'arch') line((d0 + d1) / 2, base + fh * 0.8, (d0 + d1) / 2, base + fh * 0.95, 0);
      line(d0 - rb * 0.05, base + fh * 0.25, d1 + rb * 0.05, base + fh * 0.25, 0);
      if (balconyFloor && r() < 0.6) balcony(d0, d1, base + fh * 0.2, line);
    }
  }
  if (gh > 0) for (b = 0; b < bays; b++) {
    d0 = b * rb + rb * 0.25; d1 = (b + 1) * rb - rb * 0.25;
    if (b === door) rect(d0, 0, d1, gh * 0.75, 0);
    else { rect(d0, gh * 0.3, d1, gh * 0.85, 0); if (o.awnings && r() < 0.6) awning(d0, d1, gh, line); }
  }
  if (o.roofscape) rooftops(r, W, H, line, rect);
  return { fills: fills, strokes: strokes };
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

/** Street furniture along one side: kerb, road dashes, lamp posts, and trees from a branching rule. */
function street(r, cam, S, L) {
  var strokes = [];
  function P(d, h, e) { return cam(S.pt(d, h, e)); }
  strokes.push([P(0, 0, 3), P(L, 0, 3)], [P(0, 0.15, 3), P(L, 0.15, 3)], [P(0, 0.15, 3.2), P(L, 0.15, 3.2)]);
  for (var d = 3 + r() * 4; d < L; d += 4) strokes.push([P(d, 0, 9), P(Math.min(L, d + 2), 0, 9)]);
  for (d = 5 + r() * 6; d < L; d += 13 + r() * 5) {
    strokes.push([P(d, 0, 2.5), P(d, 5.2, 2.5)], [P(d, 5.2, 2.5), P(d, 5.2, 1.7)], [P(d, 5.2, 1.7), P(d, 4.8, 1.7)]);
    strokes.push([P(d - 0.25, 4.8, 1.7), P(d + 0.25, 4.8, 1.7)], [P(d - 0.25, 4.8, 1.7), P(d - 0.15, 4.4, 1.7)], [P(d + 0.25, 4.8, 1.7), P(d + 0.15, 4.4, 1.7)]);
  }
  function branch(d, h, ang, len, depth) {
    var d2 = d + Math.sin(ang) * len, h2 = h + Math.cos(ang) * len;
    strokes.push([P(d, h, 4.5), P(d2, h2, 4.5)]);
    if (depth > 0) { var k = 2 + (r() < 0.4 ? 1 : 0); for (var i = 0; i < k; i++) branch(d2, h2, ang + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.15), depth - 1); }
  }
  for (d = 8 + r() * 8; d < L; d += 12 + r() * 10) if (r() < 0.7) { strokes.push([P(d, 0, 4.5), P(d, 2.2, 4.5)]); branch(d, 2.2, (r() - 0.5) * 0.3, 1.4 + r() * 0.6, 4); }
  return strokes;
}

/** A row of plain tall buildings on a plane 18 units behind the front row. */
function backRow(r, cam, S, L) {
  var out = [], off = -6, plane = { pt: function (d, h, e) { return S.pt(d, h, e - 18); } };
  while (off < L + 14) {
    var w = 8 + Math.floor(r() * 12), fl = 8 + Math.floor(r() * 14);
    var b = building(r, cam, plane, { off: off, width: w, floors: fl, floorH: 3, groundH: 0, bayW: 3, window: 'rect', door: false });
    out.push({ fills: b.fills, strokes: b.strokes });
    off += w + (r() < 0.4 ? 3 : 0);
  }
  return out;
}

/** The front row of one side: buildings and gaps, each tagged with its offset for sorting. */
function frontRow(r, cam, S, L, full) {
  var front = [], off = 0, i = 0, types = ['rect', 'arch', 'tall', 'paired', 'grid'];
  while (off < L) {
    var groundH = 3.6 + r() * 1.2;
    if (i > 0 && r() < 0.28) { var g = gap(r, cam, S, off, groundH); front.push({ strokes: g.strokes, off: off }); off += g.width; i++; continue; }
    var tower = r() < (full ? 0.3 : 0.18), floors = tower ? (full ? 12 : 9) + Math.floor(r() * (full ? 8 : 5)) : 4 + Math.floor(r() * 8);
    var floorH = 2.8 + r() * 0.8, width = 10 + Math.floor(r() * 14);
    var base = { off: off, width: width, floors: floors, floorH: floorH, groundH: groundH, bayW: 2.4 + r() * 1.6, window: pick(r, types), door: true,
      roofscape: true, balconies: full && r() < 0.5, awnings: full && r() < 0.5, brackets: r() < 0.5, quoins: r() < 0.35, rustication: r() < 0.4 };
    var parts = [];
    if (full && floors >= 6 && r() < 0.35) {
      var lower = 3 + Math.floor(r() * (floors - 4)), inset = width * (0.1 + r() * 0.12);
      var lo = Object.assign({}, base, { floors: lower, roofscape: false });
      var hi = Object.assign({}, base, { off: off + inset, width: width - 2 * inset, floors: floors - lower, groundH: 0, door: false, h0: groundH + lower * floorH, awnings: false, rustication: false });
      parts.push(building(r, cam, S, hi)); parts.push(building(r, cam, S, lo));
    } else parts.push(building(r, cam, S, base));
    parts.forEach(function (bd) { front.push({ fills: bd.fills, strokes: bd.strokes, off: off }); });
    off += width; i++;
  }
  front.push({ strokes: street(r, cam, S, L), off: -1 });
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
  return items.map(function (it) { return { fills: (it.fills || []).map(function (poly) { return poly.map(fitp); }), strokes: clip(it.strokes) }; });
}

/** The street corner. r: generator. R: region {x, y, w, h}. opts: pitch (three-point), full (crowded recipe).
    Returns items for renderTo, drawIn, or bounce. */
function corner4(r, R, opts) {
  opts = opts || {};
  var full = !!opts.full;
  var A = (full ? 9 : 14) + r() * 12, B = (full ? 9 : 14) + r() * 12, eye = r() < (full ? 0.7 : 0.85) ? 1.7 : 5 + r() * 9;
  var C = [-A, -B, eye], T = [8 + r() * 12, 5 + r() * 8, eye], pitch = opts.pitch ? 0.18 + r() * 0.22 : 0;
  var cam = pinhole(C, T, pitch);
  var sides = [[side(false), 26 + r() * 20], [side(true), 44 + r() * 30]], items = [], front = [];
  if (full) sides.forEach(function (sd) { backRow(r, cam, sd[0], sd[1]).forEach(function (it) { items.push(it); }); });
  sides.forEach(function (sd) { frontRow(r, cam, sd[0], sd[1], full).forEach(function (it) { front.push(it); }); });
  front.sort(function (a, b) { return b.off - a.off; });
  front.forEach(function (it) { items.push(it); });
  return fitToRegion(items, cam([0, 0, 0]), R);
}

/** Friendlier name for the same generator. */
var streetCorner = corner4;

/* ---- components.js ---- */
/* Web Components: <dmg-street-corner> and <dmg-massing>.
   Each element owns a canvas sized to its own box at device pixel ratio and draws the
   chosen generator into it. The page decides placement and size through CSS. */

var STYLE = ':host{display:block;position:relative;min-height:240px}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}';

/** Generators by element kind. Each takes (r, region, attrs) and returns items. */
var GENERATORS = {
  corner: function (r, R, a) { return corner4(r, R, { pitch: a.pitch, full: a.full }); },
  massing: function (r, R, a) { return massing3(r, R, { terraces: true, towers: true, hatchlight: true }); }
};

/** Read the element's attributes into a plain object with defaults. */
function readAttrs(el) {
  var seed = el.getAttribute('seed');
  return {
    seed: seed === null || seed === '' ? null : Number(seed) >>> 0,
    reseed: el.getAttribute('reseed') || 'cycle',
    mode: el.getAttribute('mode') || 'bounce',
    pitch: el.hasAttribute('pitch'),
    full: el.hasAttribute('full'),
    color: el.getAttribute('color') || '#C4C6CB',
    page: el.getAttribute('page') || '#FFFFFF'
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

/** Build the element class for one generator kind. Defined lazily so the module loads without a DOM. */
function makeClass(kind) {
  return class extends HTMLElement {
    static get observedAttributes() { return ['seed', 'reseed', 'mode', 'pitch', 'full', 'color', 'page']; }

    constructor() {
      super();
      this._stop = null; this._seed = null; this._canvas = null; this._ro = null;
    }

    /** The seed of the drawing currently shown. Setting it redraws with that seed. */
    get seed() { return this._seed; }
    set seed(v) { this.setAttribute('seed', String(v >>> 0)); }

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
      var items = GENERATORS[kind](rng(seed), region, attrs), sp = speedsFor(items, 7, 4);
      return { items: items, pxPerSecond: sp.pxPerSecond, pxPerSecondOut: sp.pxPerSecondOut };
    }

    /** (Re)start drawing into the canvas at the element's current size. */
    _start(forcedSeed) {
      this.stop();
      var s = fitCanvas(this, this._canvas); if (!s) return;
      var attrs = readAttrs(this), self = this, first = this._fresh(s.region, attrs, forcedSeed);
      var opts = { color: attrs.color, page: attrs.page, pxPerSecond: first.pxPerSecond, pxPerSecondOut: first.pxPerSecondOut, holdFull: 5000, holdEmpty: 700 };
      if (attrs.mode === 'once') { this._stop = drawIn(s.ctx, first.items, opts); return; }
      if (attrs.reseed === 'cycle' && attrs.seed == null) opts.onEmpty = function () { return self._fresh(s.region, attrs); };
      this._stop = bounce(s.ctx, first.items, opts);
    }
  };
}

/** Register both elements. Safe to call more than once and outside a browser (no-op). */
function defineComponents() {
  if (typeof customElements === 'undefined' || typeof HTMLElement === 'undefined') return false;
  if (!customElements.get('dmg-street-corner')) customElements.define('dmg-street-corner', makeClass('corner'));
  if (!customElements.get('dmg-massing')) customElements.define('dmg-massing', makeClass('massing'));
  return true;
}

var ProceduralLines = { rng, hashSeed, clockSeed, pick, makeIso, facadePoint, pinhole, windowOf, facade, facade2, gapElement, wfc, massing, painterOrder, hatchFace, boxDrawing, boxDrawing2, massing3, corner4, streetCorner, renderTo, totalLength, speedsFor, drawIn, bounce, reducedMotion, defineComponents };
if (typeof module === 'object' && module.exports) module.exports = ProceduralLines;
if (global) global.ProceduralLines = ProceduralLines;
defineComponents();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
