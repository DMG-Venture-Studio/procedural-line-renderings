/* Public entry point. Importing registers the two Web Components when a DOM exists. */
export { rng, hashSeed, clockSeed, pick } from './random.js';
export { makeIso, facadePoint, pinhole } from './camera.js';
export { windowOf, facade, facade2, gapElement } from './grammar.js';
export { wfc } from './wfc.js';
export { massing, painterOrder, hatchFace, boxDrawing, boxDrawing2, massing3 } from './massing.js';
export { corner4, streetCorner } from './corner.js';
export { renderTo, totalLength, speedsFor, drawIn, bounce, reducedMotion } from './render.js';
export { defineComponents } from './components.js';
import { defineComponents as define } from './components.js';
define();
