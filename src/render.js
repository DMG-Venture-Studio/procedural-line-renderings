/* Rendering: a progress renderer and the animation runners.
   A drawing is a list of items {fills: [polygon], strokes: [[p, q], ...]} in draw order. */

/** True when the viewer asked for reduced motion (false outside a browser). */
export function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Draw items up to px of total stroke length. Clears first. Each item's page-colour fills
    appear as soon as that item starts, which is what removes hidden lines. */
export function renderTo(ctx, items, px, opts) {
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
export function totalLength(items) {
  var t = 0;
  items.forEach(function (it) { it.strokes.forEach(function (s) { t += Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]); }); });
  return t;
}

/** Speeds that plot a drawing in about secondsIn and out in about secondsOut. */
export function speedsFor(items, secondsIn, secondsOut) {
  var len = totalLength(items);
  return { pxPerSecond: len / (secondsIn || 7), pxPerSecondOut: len / (secondsOut || 4) };
}

/** Draw in once and stop. opts: color, page, pxPerSecond, instant. Returns a stop function. */
export function drawIn(ctx, items, opts) {
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
export function bounce(ctx, items, opts) {
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
