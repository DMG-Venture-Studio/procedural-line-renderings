/* Public entry point. Importing registers the Web Components when a DOM exists. */
export { rng, hashSeed, clockSeed, pick } from './random.js';
export { makeIso, facadePoint, pinhole, facesCamera, fitSimilarity } from './camera.js';
export { windowOf, facade, facade2, gapElement } from './grammar.js';
export { OPTIONS, CORNER_OPTIONS, MASSING_OPTIONS, SKYLINE_OPTIONS, PLAN_OPTIONS, PARAMS, PRESETS, GLOW_KINDS, defaults, resolve, diffFromDefaults, randomizeOptions } from './options.js';
export { wfc } from './wfc.js';
export { faceFacade, wantsFacades } from './facades.js';
export { massing, painterOrder, hatchFace, boxDrawing, boxDrawing2, massing3 } from './massing.js';
export { corner4, streetCorner } from './corner.js';
export { skyline } from './skyline.js';
export { plan } from './plan.js';
export { renderTo, totalLength, speedsFor, drawIn, bounce, reducedMotion } from './render.js';
export { defineComponents, snippetFor, declaredOptions, TAGS, NIGHT } from './components.js';
import { defineComponents as define } from './components.js';
define();
