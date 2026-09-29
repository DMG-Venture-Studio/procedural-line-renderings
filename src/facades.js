/* Facades on box faces: the street corner's grammar (window families, ornament, millwork, ink
   pieces, balconies, awnings, rooftops) drawn on the two visible faces of a massing box, plus the
   street set along the plot's two street edges. Every helper here maps a face's local facade
   coordinates (d along the face, h up, e outward) into world units and hands the corner's own
   drawing functions a projection, so the same code decorates a box and a street building. */
import { pick } from './random.js';
import { windowOf } from './grammar.js';
import { helper, ornament, floors, groundFloor, rooftops, windowPool, street } from './corner.js';
import * as mw from './millwork.js';
import * as ink from './ink.js';

/** Facade units per box unit. One box unit is one floor of three facade units, so window, trim
    and cornice sizes keep the proportions they have on the street corner. */
export var FACADE_UNITS = 3;

/** The massing flags that ask for facades on box faces. Any one of them on switches every
    non-tower box from blank hatched faces to a facade drawn with the corner grammar. */
var FACADE_FLAGS = ['winRect', 'winArch', 'winTall', 'winPaired', 'winGrid', 'brackets', 'quoins', 'keystones', 'rustication',
  'architraves', 'lintels', 'shutters', 'stringCourses', 'dentils', 'pediments', 'pilasters', 'transoms', 'parapetCaps', 'fireEscapes',
  'bays', 'deepCornice', 'shadowHatch', 'stoop', 'planters', 'arches', 'balconies', 'awnings', 'rooftops'];

/** True when any facade flag is on in resolved massing options F. */
export function wantsFacades(F) {
  return FACADE_FLAGS.some(function (k) { return F[k]; });
}

/** True when any street flag is on in resolved massing options F. */
export function wantsStreet(F) {
  return !!(F.kerb || F.roadDashes || F.lamps || F.trees || F.fence);
}

/** Per-box recipe drawn from the flags with a per-box chance, so a cluster varies box to box the
    way a street varies building to building. Mirrors the corner's buildingRecipe. */
export function boxRecipe(r, F) {
  return {
    window: pick(r, windowPool(F)), sunRight: F.sunRight, keystones: F.keystones, shadowHatch: F.shadowHatch, roof: 'flat',
    balconies: F.balconies && r() < 0.6, awnings: F.awnings && r() < 0.6,
    brackets: F.brackets && r() < 0.7, quoins: F.quoins && r() < 0.5, rustication: F.rustication && r() < 0.6,
    architraves: F.architraves && r() < 0.6, lintels: F.lintels && r() < 0.6, shutters: F.shutters && r() < 0.5, pediments: F.pediments && r() < 0.5,
    stringCourses: F.stringCourses && r() < 0.7, dentils: F.dentils && r() < 0.6, pilasters: F.pilasters && r() < 0.5, transoms: F.transoms && r() < 0.7,
    parapetCaps: F.parapetCaps && r() < 0.8, fireEscape: F.fireEscapes && r() < 0.4,
    bays: F.bays && r() < 0.6, deepCornice: F.deepCornice && r() < 0.7, stoop: F.stoop && r() < 0.8,
    planters: F.planters && r() < 0.7, arches: F.arches && r() < 0.6, rooftops: F.rooftops && r() < 0.7
  };
}

/** The face-local side for a box: pt(d, h, e) -> world, with e outward from the face.
    which is 'x' for the +x face (d runs along y) or 'y' for the +y face (d runs along x). */
function faceSide(b, which, z0) {
  var U = FACADE_UNITS, X = b.x + b.dx, Y = b.y + b.dy;
  if (which === 'x') return { W: b.dy * U, pt: function (d, h, e) { return [X + e / U, b.y + d / U, z0 + h / U]; } };
  return { W: b.dx * U, pt: function (d, h, e) { return [b.x + d / U, Y + e / U, z0 + h / U]; } };
}

/** Which bay columns of a face carry a curved bay window, and over which floors. */
function faceBayColumns(r, o, bays, nF) {
  var out = {};
  if (!o.bays || nF < 2) return out;
  for (var b = 0; b < bays; b++) if (r() < 0.35) { var f0 = r() < 0.5 ? 0 : 1; out[b] = [f0, Math.max(f0 + 1, nF - (r() < 0.5 ? 0 : 1))]; }
  return out;
}

/** The facade on one visible face of box b. iso: world to screen. rec: the box's recipe. ground:
    the box sits on the ground, so its first unit is a ground floor with a door and shopfronts.
    withDoor: this face gets the door. Returns {strokes, glows, extras, door} where extras are
    items that project from the face (bays, cornice, stoop, planters) and draw right after the box,
    and door is the door's d-range on the face in facade units, or null. */
export function faceFacade(r, iso, b, which, rec, ground, withDoor) {
  var U = FACADE_UNITS, z0 = b.z + (b.lift || 0), S = faceSide(b, which, z0);
  var cam = function (P) { return iso(P[0], P[1], P[2]); };
  var gh = ground ? U : 0, nF = b.dz - (ground ? 1 : 0), W = S.W;
  var o = Object.assign({}, rec, { off: 0, width: W, groundH: gh, floors: nF, floorH: U, h0: 0, door: !!withDoor, bayW: 2.4 + r() * 1.2 });
  var strokes = [], fills = [], glows = [], g = helper(cam, S, o, strokes, fills, glows, r);
  var win = windowOf(o.window, g.line, function (a, b2, c, d) { g.rect(a, b2, c, d, 0); });
  if (gh > 0) g.line(0, gh, W, gh, 0);
  g.line(0, g.H - 0.3, W, g.H - 0.3, 0);
  ornament(o, g);
  if (o.stringCourses) mw.stringCourses(g);
  if (o.dentils && !o.deepCornice) mw.dentils(g);
  if (o.parapetCaps) mw.parapetCap(g);
  if (o.shadowHatch && !o.deepCornice) ink.shadeBand(g, 0, W, g.H - 0.3, 0.5);
  var bays = Math.max(1, Math.floor(W / o.bayW)), rb = W / bays, door = o.door ? Math.floor(r() * bays) : -1;
  if (o.pilasters) mw.pilasters(g, bays, rb);
  var bayCols = faceBayColumns(r, o, bays, nF);
  floors(r, o, g, bays, rb, win, bayCols);
  var doorRange = gh > 0 ? groundFloor(r, o, g, bays, rb, door) : null;
  for (var k in bayCols) g.extras.push(ink.bayWindow(r, g, k * rb + rb * 0.12, (+k + 1) * rb - rb * 0.12, bayCols[k][0], bayCols[k][1], o));
  if (o.fireEscape) { var fb = Math.floor(r() * bays); mw.fireEscape(g, fb * rb + rb * 0.25, (fb + 1) * rb - rb * 0.25); }
  if (o.deepCornice) g.extras.push(ink.deepCornice(g, o));
  if (o.rooftops && which === 'x' && !b.gable && !b.mansard) rooftops(r, g);
  return { strokes: strokes, glows: glows, extras: g.extras, door: doorRange };
}

/** The street set along the plot's two street edges (x = g and y = g), each a side like the
    corner's: kerb, road dashes, lamps, trees, and the fence with gates. gates: [[d0, d1], ...]
    per side in facade units along that edge. Returns two items. */
export function streetAround(r, iso, g, F, gates) {
  var U = FACADE_UNITS, cam = function (P) { return iso(P[0], P[1], P[2]); };
  var sides = [
    { pt: function (d, h, e) { return [g + e / U, d / U, h / U]; } },
    { pt: function (d, h, e) { return [d / U, g + e / U, h / U]; } }
  ];
  var o = { kerb: F.kerb, roadDashes: F.roadDashes, lamps: F.lamps, trees: F.trees, fence: F.fence };
  return sides.map(function (S, k) { return { strokes: street(r, cam, S, g * U, o, gates[k] || []) }; });
}

/** How far the street set reaches past the plot edge, in box units, for fitting. */
export function streetReach(F) {
  if (F.roadDashes) return 3.2;
  if (F.trees) return 1.8;
  if (F.kerb || F.lamps || F.fence) return 1.3;
  return 0;
}
