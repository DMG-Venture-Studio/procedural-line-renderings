/* Option schemas: every switchable feature of every generator, with its family, default, and a
   one-line description. This is the single source of truth: the components parse against it,
   the docs page builds its checkbox grids from it, and the test toggles every entry. */

/** One flag entry. family groups flags on the docs page; def is the default value. */
function flag(name, family, def, text) { return { name: name, family: family, def: def, text: text }; }

/** Street corner flags. */
export var CORNER_OPTIONS = [
  flag('randomCamera', 'camera', true, 'Vary camera distance and eye height per seed.'),
  flag('pitch', 'camera', false, 'Tilt the camera up for three-point perspective.'),
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

/** Axonometric massing flags. */
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
  flag('randomAngle', 'camera', false, 'A different dimetric angle per seed.')
];

/** Wave Function Collapse skyline flags. */
export var SKYLINE_OPTIONS = [
  flag('windows', 'windows', true, 'Window tiles on the walls.'),
  flag('doors', 'windows', true, 'Door tiles at street level.'),
  flag('bands', 'ornament', true, 'Horizontal band tiles.'),
  flag('cornices', 'ornament', true, 'A second line under every roofline.'),
  flag('streets', 'massing', true, 'Allow street tiles between buildings.')
];

/** Truss flags. */
export var TRUSS_OPTIONS = [
  flag('pratt', 'web', true, 'Allow the Pratt web (verticals with diagonals to the centre).'),
  flag('warren', 'web', true, 'Allow the Warren web (alternating diagonals).'),
  flag('doubleLines', 'members', true, 'Draw members as two parallel lines.'),
  flag('gussets', 'members', true, 'Gusset circles at every joint.'),
  flag('deck', 'context', true, 'The deck line under the bottom chord.'),
  flag('piers', 'context', true, 'Piers down to hatched footings.')
];

/** Floor plan flags. */
export var PLAN_OPTIONS = [
  flag('doors', 'openings', true, 'A door swing cut into every partition.'),
  flag('windows', 'openings', true, 'A window in the outer wall for every room touching it.'),
  flag('poche', 'walls', true, 'Hatch the outer wall thickness.'),
  flag('stair', 'fixtures', true, 'A stair in the largest room.')
];

/** All schemas by generator kind. */
export var OPTIONS = { corner: CORNER_OPTIONS, massing: MASSING_OPTIONS, skyline: SKYLINE_OPTIONS, truss: TRUSS_OPTIONS, plan: PLAN_OPTIONS };

/** Defaults for a kind as a plain object. */
export function defaults(kind) {
  var out = {};
  (OPTIONS[kind] || []).forEach(function (f) { out[f.name] = f.def; });
  return out;
}

/** Merge user options over the defaults for a kind. Unknown keys are kept. */
export function resolve(kind, opts) {
  var out = defaults(kind);
  if (opts) for (var k in opts) if (opts[k] !== undefined) out[k] = opts[k];
  return out;
}

/** The subset of opts that differs from the defaults, for short snippets. */
export function diffFromDefaults(kind, opts) {
  var d = defaults(kind), out = {};
  for (var k in opts) if (k in d && opts[k] !== d[k]) out[k] = opts[k];
  return out;
}
