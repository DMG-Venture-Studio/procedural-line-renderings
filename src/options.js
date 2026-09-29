/* Option schemas: every switchable feature of every generator, with its family, default, and a
   one-line description. This is the single source of truth: the components parse against it,
   the docs page builds its checkbox grids from it, and the test toggles every entry.
   Flags are booleans. Params are small enumerations (the perspective mode). Presets are named
   bundles of flags that reproduce a look. */

/** One flag entry. family groups flags on the docs page; def is the default value. */
function flag(name, family, def, text) { return { name: name, family: family, def: def, text: text }; }

/** One param entry: an enumeration with a default and a description per value. */
function param(name, values, def, text, meanings) { return { name: name, values: values, def: def, text: text, meanings: meanings || {} }; }

/** Street corner flags. */
export var CORNER_OPTIONS = [
  flag('randomCamera', 'camera', true, 'Vary camera distance and eye height per seed.'),
  flag('closeCamera', 'camera', false, 'Stand closer to the corner so the buildings loom.'),
  flag('gaps', 'massing', true, 'Break the street wall with lots, alleys and garages.'),
  flag('towers', 'massing', true, 'Let some buildings run nine floors or more.'),
  flag('setbacks', 'massing', false, 'Step tall buildings in at a random floor.'),
  flag('backRow', 'massing', false, 'A second row of taller buildings behind the first.'),
  flag('winRect', 'windows', true, 'Plain rectangular windows in the family pool.'),
  flag('winArch', 'windows', true, 'Round-arched windows in the pool.'),
  flag('winTall', 'windows', true, 'Tall narrow windows in the pool.'),
  flag('winPaired', 'windows', true, 'Paired windows with a mullion in the pool.'),
  flag('winGrid', 'windows', true, 'Industrial grids of small panes in the pool.'),
  flag('brackets', 'ornament', true, 'Brackets under the cornice.'),
  flag('quoins', 'ornament', true, 'Alternating quoins at building edges.'),
  flag('keystones', 'ornament', true, 'Keystones over arched windows.'),
  flag('rustication', 'ornament', true, 'Rustication joints across ground floors.'),
  flag('architraves', 'millwork', false, 'A moulded surround around each window.'),
  flag('lintels', 'millwork', false, 'A flat lintel over each window.'),
  flag('shutters', 'millwork', false, 'Louvred shutters flanking windows.'),
  flag('stringCourses', 'millwork', false, 'A shallow band between floors.'),
  flag('dentils', 'millwork', false, 'A row of small blocks under the cornice.'),
  flag('pediments', 'millwork', false, 'Triangular pediments over some windows.'),
  flag('pilasters', 'millwork', false, 'Flat columns between bays with capital and base.'),
  flag('transoms', 'millwork', false, 'A transom light over each shopfront.'),
  flag('parapetCaps', 'millwork', false, 'A coping cap on the parapet.'),
  flag('fireEscapes', 'millwork', false, 'An iron fire escape on one bay.'),
  flag('bays', 'ink', false, 'Curved bay windows projecting from the wall across several floors.'),
  flag('roundedCorner', 'ink', false, 'A quarter-round corner with windows wrapping around it.'),
  flag('deepCornice', 'ink', false, 'A projecting cornice with brackets, dentils and a hatched soffit.'),
  flag('shadowHatch', 'ink', false, 'Hatch the reveals and the bands under every projection on the shaded side.'),
  flag('fence', 'ink', false, 'An iron fence along the pavement with a gate at each door.'),
  flag('stoop', 'ink', false, 'Steps and cheek walls up to every door.'),
  flag('planters', 'ink', false, 'Planter boxes with foliage at ground level and on balconies.'),
  flag('arches', 'ink', false, 'Round-arched openings at ground level and behind balconies.'),
  flag('kerb', 'street', true, 'The kerb and pavement edge.'),
  flag('roadDashes', 'street', true, 'Centre-line dashes on the road.'),
  flag('lamps', 'street', true, 'Lamp posts along the pavement.'),
  flag('trees', 'street', true, 'Trees grown by a branching rule.'),
  flag('balconies', 'depth', false, 'Balconies with railings projecting from the facade.'),
  flag('awnings', 'depth', false, 'Striped awnings over shopfronts.'),
  flag('rooftops', 'roof', true, 'Chimneys, tanks, bulkheads, antennas, billboards.'),
  flag('gables', 'roof', false, 'A gable profile on some buildings.'),
  flag('mansards', 'roof', false, 'A mansard storey with dormers on some buildings.')
];

/** Massing flags. */
export var MASSING_OPTIONS = [
  flag('terraces', 'massing', true, 'Stacks that step back as they rise, with railings.'),
  flag('towers', 'massing', true, 'Tall thin volumes with floor lines and mullions.'),
  flag('courtyards', 'massing', false, 'L and U shaped footprints with inner faces.'),
  flag('cantilevers', 'massing', false, 'Upper boxes that overhang on thin columns.'),
  flag('hatchlight', 'light', true, 'Three hatch weights as a light study.'),
  flag('openings', 'windows', false, 'Windows on the visible faces on a floor grid.'),
  flag('gables', 'roof', false, 'Pitched roofs on some boxes.'),
  flag('ground', 'context', false, 'Plot boundary, paths and trees under the model.'),
  flag('exploded', 'context', false, 'Lift each level apart with dashed guide lines.'),
  flag('randomAngle', 'camera', false, 'A different dimetric angle per seed (axonometric only).')
];

/** City-block skyline flags. */
export var SKYLINE_OPTIONS = [
  flag('setbacks', 'massing', true, 'Towers step in as they rise.'),
  flag('podiums', 'massing', true, 'Low wide buildings between the towers.'),
  flag('dense', 'massing', false, 'More lots, closer together.'),
  flag('spires', 'crowns', true, 'Pyramid spires on some towers.'),
  flag('domes', 'crowns', true, 'Domes on some towers, drawn as rings and meridians.'),
  flag('masts', 'crowns', true, 'Antenna masts with crossbars on some towers.'),
  flag('crowns', 'crowns', true, 'Columned or stepped crowns on some towers.'),
  flag('floorLines', 'glazing', true, 'A line at every floor on every visible face.'),
  flag('mullions', 'glazing', true, 'Vertical mullions on glass towers.'),
  flag('street', 'street', true, 'Kerbs and lane dashes on the avenue and cross streets.')
];

/** Floor plan flags. */
export var PLAN_OPTIONS = [
  flag('doors', 'openings', true, 'A door swing cut into every partition.'),
  flag('windows', 'openings', true, 'A window in the outer wall for every room touching it.'),
  flag('poche', 'walls', true, 'Hatch the outer wall thickness.'),
  flag('stair', 'fixtures', true, 'A stair in the largest room.')
];

/** Enumerated params by kind. `perspective` is the camera model: 0 axonometric, 1 one-point,
    2 two-point, 3 three-point (pitched up). */
export var PARAMS = {
  corner: [param('perspective', [2, 3], 2, 'Camera model.', { 2: 'Two-point: camera level, verticals stay vertical.', 3: 'Three-point: camera pitched up, verticals converge.' })],
  massing: [param('perspective', [0, 2, 3], 0, 'Camera model.', { 0: 'Axonometric, the default.', 2: 'Two-point pinhole camera above and outside the cluster.', 3: 'Three-point pinhole camera low and pitched up.' })],
  skyline: [param('perspective', [1, 2, 3], 2, 'Camera model.', { 1: 'One-point: down the avenue, towers on both sides converge on the vanishing point.', 2: 'Two-point: from a street corner outside the block.', 3: 'Three-point: street level between towers, pitched up.' })],
  plan: []
};

/** Named bundles of flags. The `ink` preset approximates a pen-and-ink corner house. */
export var PRESETS = {
  corner: {
    ink: { bays: true, roundedCorner: true, deepCornice: true, shadowHatch: true, fence: true, stoop: true, planters: true, arches: true,
      dentils: true, brackets: true, architraves: true, balconies: true, towers: false, gaps: false, backRow: false, closeCamera: true, rooftops: false }
  },
  massing: {},
  skyline: {},
  plan: {}
};

/** All schemas by generator kind. */
export var OPTIONS = { corner: CORNER_OPTIONS, massing: MASSING_OPTIONS, skyline: SKYLINE_OPTIONS, plan: PLAN_OPTIONS };

/** Kinds that have windows to light with `glow`. */
export var GLOW_KINDS = { corner: true, massing: true, skyline: true, plan: false };

/** Defaults for a kind as a plain object: every flag and every param. */
export function defaults(kind) {
  var out = {};
  (OPTIONS[kind] || []).forEach(function (f) { out[f.name] = f.def; });
  (PARAMS[kind] || []).forEach(function (p) { out[p.name] = p.def; });
  return out;
}

/** Merge user options over the defaults for a kind. Unknown keys are kept. Params are coerced to
    one of their allowed values; an unsupported value falls back to the default with a warning. */
export function resolve(kind, opts) {
  var out = defaults(kind);
  if (opts) for (var k in opts) if (opts[k] !== undefined) out[k] = opts[k];
  (PARAMS[kind] || []).forEach(function (p) {
    var v = Number(out[p.name]);
    if (p.values.indexOf(v) < 0) {
      if (out[p.name] !== undefined && out[p.name] !== p.def && typeof console !== 'undefined' && console.warn) console.warn(kind + ': ' + p.name + ' ' + out[p.name] + ' is not supported, using ' + p.def);
      v = p.def;
    }
    out[p.name] = v;
  });
  return out;
}

/** The subset of opts that differs from the defaults, for short snippets. */
export function diffFromDefaults(kind, opts) {
  var d = defaults(kind), out = {};
  for (var k in opts) if (k in d && opts[k] !== d[k]) out[k] = opts[k];
  return out;
}
