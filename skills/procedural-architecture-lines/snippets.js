/* Standalone pieces for procedural architectural line drawings on canvas.
   Each function is independent; paste what you need. See SKILL.md.
   Drawings are lists of items: {fills: [polygon], strokes: [[p, q], ...]} in draw order. */

/* Seeded generator (mulberry32). Same seed, same drawing. */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* FNV-1a hash of a string to a 32-bit seed. Feed it the clock for a per-visit drawing. */
function hashSeed(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/* Axonometric projection. ox, oy: screen origin. u: px per unit. deg: axis angle. */
function makeIso(ox, oy, u, deg) {
  var a = (deg || 30) * Math.PI / 180, C = Math.cos(a), S = Math.sin(a);
  return function (x, y, z) { return [ox + (x - y) * C * u, oy + (x + y) * S * u - z * u]; };
}

/* Two-point perspective for a point on a vertical facade.
   d: distance along the facade from the corner. h: height.
   vpx: vanishing point x. cx, groundY: corner on screen. hy: horizon y.
   D0: recession rate. scale: px per unit of height at the corner. */
function facadePoint(d, h, vpx, cx, groundY, hy, D0, scale) {
  var t = d / (d + D0);
  var x = cx + (vpx - cx) * t;
  var yc = groundY - h * scale;
  return [x, hy + (yc - hy) * (1 - t)];
}

/* Box massing: a seeded cluster of stacked boxes on a grid, sorted far to near. */
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
  boxes.sort(function (a, b) { return (a.x + a.dx / 2 + a.y + a.dy / 2 + a.z + a.dz / 2) - (b.x + b.dx / 2 + b.y + b.dy / 2 + b.z + b.dz / 2); });
  return boxes;
}

/* Visible faces of a box in axonometric view plus hatch lines on the +x face. */
function boxDrawing(b, iso, hatchSpacing) {
  var X = b.x + b.dx, Y = b.y + b.dy, Z = b.z + b.dz;
  var top = [iso(b.x, b.y, Z), iso(X, b.y, Z), iso(X, Y, Z), iso(b.x, Y, Z)];
  var fx = [iso(X, b.y, b.z), iso(X, Y, b.z), iso(X, Y, Z), iso(X, b.y, Z)];
  var fy = [iso(b.x, Y, b.z), iso(X, Y, b.z), iso(X, Y, Z), iso(b.x, Y, Z)];
  var strokes = [];
  [top, fx, fy].forEach(function (p) { for (var i = 0; i < 4; i++) strokes.push([p[i], p[(i + 1) % 4]]); });
  if (hatchSpacing) {
    var P = fx[0], U = [fx[3][0] - P[0], fx[3][1] - P[1]], V = [fx[1][0] - P[0], fx[1][1] - P[1]];
    var L = Math.hypot(U[0], U[1]);
    for (var k = hatchSpacing; k < L; k += hatchSpacing) {
      var a = [P[0] + U[0] * k / L, P[1] + U[1] * k / L];
      strokes.push([a, [a[0] + V[0], a[1] + V[1]]]);
    }
  }
  return { fills: [top, fx, fy], strokes: strokes };
}

/* Facade split grammar in facade coordinates (d along, h up). proj(d, h) -> [x, y]. */
function facade(r, proj, opts) {
  var strokes = [], W = opts.width, F = opts.floors, fh = opts.floorH, gh = opts.groundH, bw = opts.bayW;
  var H = gh + F * fh;
  function line(d0, h0, d1, h1) { strokes.push([proj(d0, h0), proj(d1, h1)]); }
  function rect(d0, h0, d1, h1) { line(d0, h0, d1, h0); line(d1, h0, d1, h1); line(d1, h1, d0, h1); line(d0, h1, d0, h0); }
  rect(0, 0, W, H);
  line(0, gh, W, gh);
  line(0, H - 0.3, W, H - 0.3);
  var bays = Math.max(1, Math.floor(W / bw)), realBw = W / bays, door = Math.floor(r() * bays);
  for (var f = 0; f < F; f++) {
    var base = gh + f * fh;
    for (var b = 0; b < bays; b++) {
      var d0 = b * realBw + realBw * 0.25, d1 = (b + 1) * realBw - realBw * 0.25;
      rect(d0, base + fh * 0.25, d1, base + fh * 0.8);
      line(d0 - realBw * 0.05, base + fh * 0.25, d1 + realBw * 0.05, base + fh * 0.25);
    }
  }
  for (b = 0; b < bays; b++) {
    d0 = b * realBw + realBw * 0.25; d1 = (b + 1) * realBw - realBw * 0.25;
    if (b === door) rect(d0, 0, d1, gh * 0.75); else rect(d0, gh * 0.3, d1, gh * 0.85);
  }
  return strokes;
}

/* Wave Function Collapse on a grid of socketed tiles.
   tiles: [{sockets: {T, R, B, L}, weight}]. bounds: {T, R, B, L} socket values
   required at the grid edges (or null). Returns a cols x rows array of tile
   indices, or null after too many contradictions. */
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
      var pick = r() * total, chosen = opts[opts.length - 1];
      for (var j = 0; j < opts.length; j++) { pick -= tiles[opts[j]].weight || 1; if (pick <= 0) { chosen = opts[j]; break; } }
      cells[best] = [chosen];
      if (!propagate(best % cols, Math.floor(best / cols))) return null;
    }
  }
  for (var t = 0; t < (maxTries || 20); t++) { var g = attempt(); if (g) return g; }
  return null;
}

/* Progress renderer. Draws items up to `px` of total stroke length. Clears first.
   Fills belong to their item and appear as soon as that item starts. */
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

/* Total stroke length of a drawing. */
function totalLength(items) {
  var t = 0;
  items.forEach(function (it) { it.strokes.forEach(function (s) { t += Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]); }); });
  return t;
}

/* Bounce animation: draw in at pxPerSecond, hold, draw out, hold, repeat.
   With opts.onEmpty, a new drawing can be supplied at the bottom of each cycle,
   which is how a page regenerates from the clock without ever showing a jump.
   Under reduced motion renders the finished drawing once. Returns a stop function. */
function bounce(ctx, items, opts) {
  var total = totalLength(items), speedIn = opts.pxPerSecond || 2000, speedOut = opts.pxPerSecondOut || speedIn * 1.6;
  var holdFull = opts.holdFull == null ? 4000 : opts.holdFull, holdEmpty = opts.holdEmpty == null ? 800 : opts.holdEmpty;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || opts.instant) { renderTo(ctx, items, total, opts); return function () {}; }
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
        // Optional reseed: onEmpty returns {items, pxPerSecond, pxPerSecondOut} or nothing.
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
