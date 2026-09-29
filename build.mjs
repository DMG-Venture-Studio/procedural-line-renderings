/* Assemble dist/procedural-line-renderings.js: the ES modules concatenated in dependency order,
   import and export syntax stripped, wrapped in an IIFE that exposes window.ProceduralLines
   and registers the components. No bundler, no dependencies. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ORDER = ['random', 'camera', 'options', 'grammar', 'millwork', 'wfc', 'render', 'massing', 'corner', 'skyline', 'truss', 'plan', 'components'];
const EXPORTS = ['rng', 'hashSeed', 'clockSeed', 'pick', 'makeIso', 'facadePoint', 'pinhole', 'windowOf', 'facade', 'facade2', 'gapElement',
  'OPTIONS', 'CORNER_OPTIONS', 'MASSING_OPTIONS', 'SKYLINE_OPTIONS', 'TRUSS_OPTIONS', 'PLAN_OPTIONS', 'defaults', 'resolve', 'diffFromDefaults',
  'wfc', 'massing', 'painterOrder', 'hatchFace', 'boxDrawing', 'boxDrawing2', 'massing3', 'corner4', 'streetCorner', 'skyline', 'truss', 'plan',
  'renderTo', 'totalLength', 'speedsFor', 'drawIn', 'bounce', 'reducedMotion', 'defineComponents', 'snippetFor', 'TAGS', 'NIGHT'];

/** Strip module syntax from one source file so it can share a single scope. The millwork module
    is imported as a namespace (`mw`), so its functions are re-exposed under that name. */
function plain(name, src) {
  var out = src
    .replace(/^import\s[^\n]*\n/gm, '')
    .replace(/^export\s+(function|var|const|let|class)\s/gm, '$1 ')
    .replace(/^export\s*\{[^}]*\}\s*from\s*'[^']*';\s*\n/gm, '');
  if (name === 'millwork') {
    var names = [...src.matchAll(/^export function (\w+)/gm)].map(m => m[1]);
    out += '\nvar mw = { ' + names.join(', ') + ' };\n';
  }
  return out;
}

const body = ORDER.map(m => `/* ---- ${m}.js ---- */\n` + plain(m, readFileSync(join(here, 'src', m + '.js'), 'utf8'))).join('\n');
const out = `/* @dmg-venture-studio/procedural-line-renderings, assembled by build.mjs. Vanilla JS, no dependencies. */
(function (global) {
'use strict';
${body}
var ProceduralLines = { ${EXPORTS.join(', ')} };
if (typeof module === 'object' && module.exports) module.exports = ProceduralLines;
if (global) global.ProceduralLines = ProceduralLines;
defineComponents();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
`;
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'procedural-line-renderings.js'), out);
writeFileSync(join(here, 'docs', 'procedural-line-renderings.js'), out);   // the Pages site serves only docs/
new Function(out);   // parse check
console.log('dist/procedural-line-renderings.js and docs/procedural-line-renderings.js', out.length, 'bytes');
