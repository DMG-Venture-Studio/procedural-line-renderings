/* Facade grammars: window families, the split grammar with rooftops, and gap elements.
   All draw in facade coordinates (d along the wall, h up) through a projection callback. */
import { pick } from './random.js';

/** A window family. Returns a drawer taking (d0, h0, d1, h1) that emits through line and rect. */
export function windowOf(type, line, rect) {
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
export function facade(r, proj, opts) {
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
export function facade2(r, proj, o) {
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
export function gapElement(r, proj, gh) {
  var strokes = [], kind = pick(r, ['lot', 'alley', 'garage']), W;
  function line(d0, h0, d1, h1) { strokes.push([proj(d0, h0), proj(d1, h1)]); }
  function rect(d0, h0, d1, h1) { line(d0, h0, d1, h0); line(d1, h0, d1, h1); line(d1, h1, d0, h1); line(d0, h1, d0, h0); }
  if (kind === 'lot') { W = 6 + Math.floor(r() * 4); for (var d = 0; d <= W; d += 0.8) line(d, 0, d, 1.2); line(0, 1.2, W, 1.2); line(0, 0.6, W, 0.6); }
  else if (kind === 'alley') { W = 2.5; line(0.6, 0, 0.6, 0.7); line(W - 0.6, 0, W - 0.6, 0.7); }
  else { W = 5 + Math.floor(r() * 4); var h = gh * 0.85; rect(0, 0, W, h); rect(0.5, 0, W - 0.5, h * 0.7); for (var k = 1; k < 4; k++) line(0.5, h * 0.7 * k / 4, W - 0.5, h * 0.7 * k / 4); line(0, h - 0.25, W, h - 0.25); }
  return { strokes: strokes, width: W };
}
