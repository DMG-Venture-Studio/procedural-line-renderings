/* Millwork and trim, drawn in facade coordinates through the building's line and rect helpers.
   Every function takes (o, g) where g = {line, rect, W, H, gh, fh, F} for the building and o holds
   the resolved flags. Each draws only its own element and returns nothing. Sources: see
   docs/research.md. Vocabulary: an architrave is the moulded surround of an opening, a lintel the
   flat member spanning it, a string course a shallow band across the facade, dentils the row of
   small blocks under a cornice, a pediment the low triangle over an opening, a pilaster a flat
   column against the wall, a transom the light over a door, a parapet cap the coping on top. */

/** Moulded surround around a window: a second rectangle just outside the opening. */
export function architrave(g, d0, h0, d1, h1) {
  var m = 0.12;
  g.rect(d0 - m, h0 - m, d1 + m, h1 + m, 0);
}

/** Flat lintel over a window: a slim bar a little wider than the opening. */
export function lintel(g, d0, h0, d1, h1) {
  g.rect(d0 - 0.15, h1 + 0.02, d1 + 0.15, h1 + 0.2, 0);
}

/** Louvred shutters flanking a window, each with two horizontal louvre lines. */
export function shutters(g, d0, h0, d1, h1) {
  var w = Math.min(0.35, (d1 - d0) * 0.4);
  [[d0 - w - 0.05, d0 - 0.05], [d1 + 0.05, d1 + w + 0.05]].forEach(function (s) {
    g.rect(s[0], h0, s[1], h1, 0);
    g.line(s[0], h0 + (h1 - h0) / 3, s[1], h0 + (h1 - h0) / 3, 0);
    g.line(s[0], h0 + 2 * (h1 - h0) / 3, s[1], h0 + 2 * (h1 - h0) / 3, 0);
  });
}

/** Triangular pediment over a window, sitting on a thin entablature line. */
export function pediment(g, d0, h0, d1, h1) {
  var top = h1 + 0.18, dm = (d0 + d1) / 2, rise = Math.min(0.5, (d1 - d0) * 0.35);
  g.line(d0 - 0.1, top, d1 + 0.1, top, 0);
  g.line(d0 - 0.1, top, dm, top + rise, 0);
  g.line(dm, top + rise, d1 + 0.1, top, 0);
}

/** A shallow band at the base of every upper floor, across the whole facade. */
export function stringCourses(g) {
  for (var f = 1; f < g.F; f++) { var h = g.gh + f * g.fh; g.line(0, h, g.W, h, 0); g.line(0, h + 0.12, g.W, h + 0.12, 0); }
}

/** Dentil course: a row of small blocks just under the cornice line. */
export function dentils(g) {
  for (var d = 0.3; d < g.W - 0.2; d += 0.36) g.rect(d, g.H - 0.55, d + 0.18, g.H - 0.4, 0);
}

/** Pilasters between bays: a flat strip with a capital line at the top and a base line at the bottom. */
export function pilasters(g, bays, rb) {
  for (var b = 1; b < bays; b++) {
    var x = b * rb, w = 0.16;
    g.rect(x - w, g.gh, x + w, g.H - 0.3, 0);
    g.line(x - w - 0.08, g.H - 0.45, x + w + 0.08, g.H - 0.45, 0);
    g.line(x - w - 0.08, g.gh + 0.15, x + w + 0.08, g.gh + 0.15, 0);
  }
}

/** A transom light over a shopfront: a horizontal split near the top with two mullions above it. */
export function transom(g, d0, h0, d1, h1) {
  var t = h1 - (h1 - h0) * 0.28, dm = (d0 + d1) / 2;
  g.line(d0, t, d1, t, 0);
  g.line(d0 + (dm - d0) / 2, t, d0 + (dm - d0) / 2, h1, 0);
  g.line(dm + (d1 - dm) / 2, t, dm + (d1 - dm) / 2, h1, 0);
}

/** Coping cap on the parapet: a slab slightly wider than the wall. */
export function parapetCap(g) {
  g.rect(-0.1, g.H, g.W + 0.1, g.H + 0.2, 0);
}

/** An iron fire escape on one bay: platforms at each floor, a railing, and a stair between floors. */
export function fireEscape(g, d0, d1) {
  var e = 0.9, a0 = d0 - 0.2, a1 = d1 + 0.2;
  for (var f = 0; f < g.F; f++) {
    var h = g.gh + f * g.fh + 0.1;
    g.line(a0, h, a1, h, e); g.line(a0, h, a0, h, 0, e); g.line(a1, h, a1, h, 0, e);
    g.line(a0, h + 0.9, a1, h + 0.9, e); g.line(a0, h, a0, h + 0.9, e); g.line(a1, h, a1, h + 0.9, e);
    for (var p = a0 + 0.3; p < a1; p += 0.3) g.line(p, h, p, h + 0.9, e);
    if (f < g.F - 1) { var top = h + g.fh; g.line(f % 2 ? a1 : a0, h, f % 2 ? a0 : a1, top, e); g.line(f % 2 ? a1 : a0, h + 0.9, f % 2 ? a0 : a1, top + 0.9, e); }
  }
}

/** A gable profile over the parapet: a triangle whose ridge is a quarter of the width up. */
export function gable(g) {
  var rise = Math.min(g.W * 0.25, 3.5);
  g.line(0, g.H, g.W / 2, g.H + rise, 0);
  g.line(g.W / 2, g.H + rise, g.W, g.H, 0);
}

/** A mansard storey: a steep trapezoid on top with two or three dormer windows. */
export function mansard(g, r) {
  var rise = 1.6, inset = 0.8;
  g.line(0, g.H, inset, g.H + rise, 0); g.line(inset, g.H + rise, g.W - inset, g.H + rise, 0); g.line(g.W - inset, g.H + rise, g.W, g.H, 0);
  var n = 2 + Math.floor(r() * 2), step = (g.W - 2 * inset) / (n + 1);
  for (var i = 1; i <= n; i++) { var c = inset + step * i; g.rect(c - 0.35, g.H + 0.3, c + 0.35, g.H + 1.1, 0); g.line(c - 0.45, g.H + 1.1, c, g.H + 1.4, 0); g.line(c, g.H + 1.4, c + 0.45, g.H + 1.1, 0); }
}
