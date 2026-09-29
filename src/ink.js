/* Pen-and-ink features for the street corner: the pieces that make a facade read as a drawn
   Victorian or villa elevation rather than a diagram. Every function draws through the building
   helper `g` (facade coordinates d along, h up, e outward) so it projects through the same camera.
   Fills are page-colour polygons for hidden-line removal; glows are window polygons for night.
   Vocabulary: a bay window projects from the wall on a curved or canted plan; a soffit is the
   underside of a projecting cornice; a reveal is the side face of an opening in a thick wall;
   a stoop is the flight of steps to a raised front door; a finial is the ornament on a post. */

/** Hatch a rectangle on the wall plane with parallel lines. dir 'v' for vertical lines, 'h' for
    horizontal. spacing in facade units. Dense spacing reads as shade in ink. */
export function hatchRect(g, d0, h0, d1, h1, dir, spacing, e) {
  e = e || 0;
  if (dir === 'v') for (var d = d0 + spacing / 2; d < d1; d += spacing) g.line(d, h0, d, h1, e);
  else for (var h = h0 + spacing / 2; h < h1; h += spacing) g.line(d0, h, d1, h, e);
}

/** Shade on the wall under and beside one opening: a hatched head band, the shaded jamb, and a
    thin sill shadow. sunRight decides which jamb is in shade. */
export function windowShade(g, d0, h0, d1, h1, sunRight) {
  hatchRect(g, d0, h1 - 0.26, d1, h1, 'v', 0.15);
  var jamb = sunRight ? [d0, d0 + 0.16] : [d1 - 0.16, d1];
  hatchRect(g, jamb[0], h0, jamb[1], h1 - 0.26, 'h', 0.15);
  hatchRect(g, d0, h0 - 0.12, d1, h0, 'v', 0.18);
}

/** The band of shade under a projection (a cornice, a bay, a balcony) across d0..d1, depth deep. */
export function shadeBand(g, d0, d1, h, deep) {
  hatchRect(g, d0, h - deep, d1, h, 'v', 0.16);
}

/** The plan polyline of a curved bay: n segments along a half-ellipse from d0 to d1 reaching depth. */
function bayPlan(d0, d1, depth, n) {
  var pts = [];
  for (var i = 0; i <= n; i++) { var t = i / n; pts.push([d0 + (d1 - d0) * t, depth * Math.sin(Math.PI * t)]); }
  return pts;
}

/** A curved bay window over the floors fStart..fEnd of one bay column. Returns an item to draw right
    after the building (it projects, so it must paint over the wall behind). Each plan segment is a
    pane per floor with its own glow polygon; the underside gets corbel brackets. */
export function bayWindow(r, g, d0, d1, fStart, fEnd, o) {
  var item = g.item(), depth = Math.min(0.95, (d1 - d0) * 0.55), plan = bayPlan(d0, d1, depth, 6);
  var hb = g.gh + fStart * g.fh, ht = g.gh + fEnd * g.fh;
  function ring(h) { for (var i = 0; i < plan.length - 1; i++) item.line(plan[i][0], h, plan[i + 1][0], h, plan[i][1], plan[i + 1][1]); }
  for (var i = 0; i < plan.length - 1; i++) {
    var a = plan[i], b = plan[i + 1];
    item.fill([[a[0], hb, a[1]], [b[0], hb, b[1]], [b[0], ht + 0.3, b[1]], [a[0], ht + 0.3, a[1]]]);
  }
  var under = plan.map(function (p) { return [p[0], hb, p[1]]; });
  item.fill(under.concat([[d1, hb, 0], [d0, hb, 0]]));
  ring(hb); ring(ht); ring(ht + 0.3);
  plan.forEach(function (p, k) {
    item.line(p[0], hb, p[0], ht + 0.3, p[1]);
    if (k > 0 && k < plan.length - 1) item.line(p[0], hb - 0.55, p[0], hb, 0, p[1]);
  });
  for (var f = fStart; f < fEnd; f++) {
    var base = g.gh + f * g.fh, h0 = base + g.fh * 0.22, h1 = base + g.fh * 0.86;
    if (f > fStart) ring(base);
    for (i = 0; i < plan.length - 1; i++) {
      a = plan[i]; b = plan[i + 1];
      var ia = [a[0] + (b[0] - a[0]) * 0.1, a[1] + (b[1] - a[1]) * 0.1], ib = [a[0] + (b[0] - a[0]) * 0.9, a[1] + (b[1] - a[1]) * 0.9];
      item.line(ia[0], h0, ib[0], h0, ia[1], ib[1]); item.line(ia[0], h1, ib[0], h1, ia[1], ib[1]);
      item.line(ia[0], h0, ia[0], h1, ia[1]); item.line(ib[0], h0, ib[0], h1, ib[1]);
      item.line(ia[0], h0 + (h1 - h0) * 0.5, ib[0], h0 + (h1 - h0) * 0.5, ia[1], ib[1]);
      item.glow([[ia[0], h0, ia[1]], [ib[0], h0, ib[1]], [ib[0], h1, ib[1]], [ia[0], h1, ia[1]]]);
      if (o.shadowHatch) for (var s = 0; s < 3; s++) { var u = 0.12 + s * 0.05; item.line(ia[0], h1 - u, ib[0], h1 - u, ia[1], ib[1]); }
    }
  }
  if (o.shadowHatch) shadeBand(g, d0, d1, hb - 0.55, 0.5);
  return item;
}

/** A deep projecting cornice: fascia, hatched soffit, brackets, and a dentil row. Returns an item. */
export function deepCornice(g, o) {
  var item = g.item(), H = g.H, W = g.W, deep = 0.8, under = H - 0.15;
  item.fill([[0, under, 0], [W, under, 0], [W, under, deep], [0, under, deep]]);
  item.fill([[0, under, deep], [W, under, deep], [W, H + 0.12, deep], [0, H + 0.12, deep]]);
  item.line(0, under, W, under, deep); item.line(0, H + 0.12, W, H + 0.12, deep);
  item.line(0, under, 0, H + 0.12, deep); item.line(W, under, W, H + 0.12, deep);
  item.line(0, under, 0, under, 0, deep); item.line(W, under, W, under, 0, deep);
  item.line(0, H + 0.12, 0, H + 0.12, 0, deep); item.line(W, H + 0.12, W, H + 0.12, 0, deep);
  for (var d = 0.08; d < W; d += 0.14) item.line(d, under, d, under, 0, deep);
  for (d = 0.35; d < W - 0.2; d += 0.7) {
    item.line(d, under - 0.7, d, under, deep * 0.75); item.line(d, under - 0.7, d, under, 0, deep * 0.75);
    item.line(d, under - 0.7, d, under - 0.7, 0, deep * 0.75);
  }
  for (d = 0.2; d < W - 0.15; d += 0.3) item.rect(d, under - 0.32, d + 0.15, under - 0.18, deep * 0.35);
  if (o.shadowHatch) shadeBand(g, 0, W, under - 0.75, 0.45);
  return item;
}

/** Steps and cheek walls up to the door in bay d0..d1. Returns an item drawn after the building. */
export function stoop(g, d0, d1, o) {
  var item = g.item(), steps = 4, rise = 0.9 / steps, run = 1.6 / steps, a0 = d0 - 0.35, a1 = d1 + 0.35;
  for (var k = 0; k <= steps; k++) {
    var h = k * rise, e = 1.6 - k * run;
    item.line(a0, h, a1, h, e);
    if (k < steps) { item.line(a0, h, a0, h + rise, e); item.line(a1, h, a1, h + rise, e); item.line(a0, h + rise, a1, h + rise, e); }
    if (k < steps) { item.line(a0, h + rise, a0, h + rise, e, e - run); item.line(a1, h + rise, a1, h + rise, e, e - run); }
  }
  [a0, a1].forEach(function (d) {
    item.fill([[d, 0, 0], [d, 1.25, 0], [d, 0.4, 1.7], [d, 0, 1.7]]);
    item.line(d, 0, d, 1.25, 0); item.line(d, 1.25, d, 0.4, 0, 1.7); item.line(d, 0.4, d, 0, 1.7); item.line(d, 0, d, 0, 0, 1.7);
    if (o.shadowHatch) for (var s = 0.15; s < 1.1; s += 0.14) item.line(d, s, d, Math.max(0, s - 0.35), 0, Math.min(1.7, 0.35 + s * 0.4));
  });
  return item;
}

/** Foliage as clustered short arcs inside an ellipse centred (dc, hc) with radii rd, rh on plane e. */
export function foliage(r, item, dc, hc, rd, rh, e) {
  var n = 10 + Math.floor(r() * 8);
  for (var i = 0; i < n; i++) {
    var ang = r() * Math.PI * 2, rad = Math.sqrt(r()), cx = dc + Math.cos(ang) * rad * rd * 0.8, cy = hc + Math.sin(ang) * rad * rh * 0.8;
    var rr = 0.1 + r() * 0.12, a0 = r() * Math.PI * 2, prev = null;
    for (var k = 0; k <= 3; k++) { var t = a0 + k / 3 * Math.PI * 0.9, p = [cx + rr * Math.cos(t), cy + rr * 0.7 * Math.sin(t)]; if (prev) item.line(prev[0], prev[1], p[0], p[1], e); prev = p; }
  }
}

/** A planter box in front of bay d0..d1 with foliage above it. Returns an item. */
export function groundPlanter(r, g, d0, d1) {
  var item = g.item(), a0 = d0 + 0.2, a1 = d1 - 0.2, ef = 1.3, eb = 0.7;
  item.fill([[a0, 0, ef], [a1, 0, ef], [a1, 0.45, ef], [a0, 0.45, ef]]);
  item.rect(a0, 0, a1, 0.45, ef);
  item.line(a0, 0.45, a0, 0.45, ef, eb); item.line(a1, 0.45, a1, 0.45, ef, eb); item.line(a0, 0.45, a1, 0.45, eb);
  foliage(r, item, (a0 + a1) / 2, 0.85, (a1 - a0) / 2, 0.4, 1.0);
  return item;
}

/** Foliage sitting on a balcony slab at height bh over d0..d1, on plane e. */
export function balconyPlanter(r, item, d0, d1, bh, e) {
  foliage(r, item, (d0 + d1) / 2, bh + 0.55, (d1 - d0) / 2 * 0.8, 0.3, e);
}

/** An iron fence along the pavement at plane e over 0..L: posts with finials, two rails, pickets,
    and a gap with tall gate posts at each door span in gates ([[d0, d1], ...]). Returns strokes. */
export function fence(r, P, L, gates, e) {
  var s = [];
  function line(d0, h0, d1, h1, ea, eb) { s.push([P(d0, h0, ea), P(d1, h1, eb == null ? ea : eb)]); }
  function inGate(d) { return gates.some(function (gt) { return d > gt[0] - 0.2 && d < gt[1] + 0.2; }); }
  for (var d = 0; d <= L; d += 1) {
    if (inGate(d)) continue;
    line(d, 0, d, 1.45, e); line(d - 0.08, 1.45, d, 1.62, e); line(d, 1.62, d + 0.08, 1.45, e);
  }
  for (d = 0; d < L; d += 0.25) {
    if (inGate(d)) continue;
    line(d, 0.35, d, 1.3, e);
    if (Math.abs(d % 1) < 1e-9 || d + 0.25 > L) continue;
  }
  var seg0 = 0;
  for (d = 0; d <= L + 1e-9; d += 0.25) {
    var gate = inGate(d);
    if ((gate || d >= L) && d > seg0) { line(seg0, 0.35, Math.min(d, L), 0.35, e); line(seg0, 1.15, Math.min(d, L), 1.15, e); }
    if (gate) seg0 = d + 0.25; else if (d >= L) break;
    if (!gate && seg0 > d) seg0 = d;
  }
  gates.forEach(function (gt) {
    [gt[0] - 0.2, gt[1] + 0.2].forEach(function (d) { if (d >= 0 && d <= L) { line(d, 0, d, 1.8, e); line(d - 0.1, 1.8, d, 2.0, e); line(d, 2.0, d + 0.1, 1.8, e); } });
  });
  return s;
}

/** The plan polyline of a quarter-round corner of radius rc from the right facade (rc, 0) to the
    left facade (0, rc), as world [x, y] points. */
export function cornerArc(rc, n) {
  var pts = [];
  for (var i = 0; i <= n; i++) { var t = i / n * Math.PI / 2; pts.push([rc - rc * Math.sin(t), rc - rc * Math.cos(t)]); }
  return pts;
}

/** The rounded corner element: a curved wall between the two first buildings, with floor rings,
    mullions at every arc vertex, a pane per floor per segment, and an arched entrance in the middle
    segment. b: the shared corner building recipe. Returns an item in world coordinates through cam. */
export function roundedCorner(r, cam, rc, b, o) {
  var pts = cornerArc(rc, 8), H = b.groundH + b.floors * b.floorH, fills = [], glows = [], strokes = [];
  function W(p, h) { return cam([p[0], p[1], h]); }
  function seg(i, u) { var a = pts[i], c = pts[i + 1]; return [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u]; }
  function line3(pa, ha, pb, hb) { strokes.push([W(pa, ha), W(pb, hb)]); }
  for (var i = 0; i < pts.length - 1; i++) fills.push([W(pts[i], 0), W(pts[i + 1], 0), W(pts[i + 1], H), W(pts[i], H)]);
  function ring(h) { for (var i = 0; i < pts.length - 1; i++) line3(pts[i], h, pts[i + 1], h); }
  ring(0); ring(b.groundH); ring(H - 0.3); ring(H);
  pts.forEach(function (p) { line3(p, 0, p, H); });
  for (var f = 0; f < b.floors; f++) {
    var base = b.groundH + f * b.floorH, h0 = base + b.floorH * 0.25, h1 = base + b.floorH * 0.8;
    if (f > 0 && o.stringCourses) ring(base);
    for (i = 0; i < pts.length - 1; i++) {
      var a = seg(i, 0.2), c = seg(i, 0.8);
      line3(a, h0, c, h0); line3(a, h1, c, h1); line3(a, h0, a, h1); line3(c, h0, c, h1);
      glows.push({ poly: [W(a, h0), W(c, h0), W(c, h1), W(a, h1)], k: r() });
      if (o.shadowHatch) for (var s = 0.08; s < 0.26; s += 0.09) line3(a, h1 - s, c, h1 - s);
    }
  }
  var mid = Math.floor((pts.length - 1) / 2), a0 = seg(mid, 0.15), a1 = seg(mid, 0.85), top = b.groundH * 0.72, rad = 0.5;
  line3(a0, 0, a0, top - rad); line3(a1, 0, a1, top - rad);
  var prev = null;
  for (var k = 0; k <= 8; k++) { var t = Math.PI - Math.PI * k / 8, u = 0.5 + 0.35 * Math.cos(t), p = seg(mid, u), h = top - rad + rad * Math.sin(t); if (prev) line3(prev[0], prev[1], p, h); prev = [p, h]; }
  if (o.brackets) for (i = 0; i < pts.length - 1; i++) for (var q = 0.25; q < 1; q += 0.25) { var bp = seg(i, q); line3(bp, H - 0.3, bp, H - 0.6); }
  return { fills: fills, glows: glows, strokes: strokes };
}
