/* Assemble dist/procedural-line-renderings.js: the ES modules concatenated in dependency order,
   import and export syntax stripped, wrapped in an IIFE that exposes window.ProceduralLines
   and registers the components. No bundler, no dependencies. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ORDER = ['random', 'camera', 'grammar', 'wfc', 'render', 'massing', 'corner', 'components'];
const EXPORTS = ['rng', 'hashSeed', 'clockSeed', 'pick', 'makeIso', 'facadePoint', 'pinhole', 'windowOf', 'facade', 'facade2', 'gapElement',
  'wfc', 'massing', 'painterOrder', 'hatchFace', 'boxDrawing', 'boxDrawing2', 'massing3', 'corner4', 'streetCorner',
  'renderTo', 'totalLength', 'speedsFor', 'drawIn', 'bounce', 'reducedMotion', 'defineComponents'];

/** Strip module syntax from one source file so it can share a single scope. */
function plain(src) {
  return src
    .replace(/^import\s[^\n]*\n/gm, '')
    .replace(/^export\s+(function|var|const|let|class)\s/gm, '$1 ')
    .replace(/^export\s*\{[^}]*\}\s*from\s*'[^']*';\s*\n/gm, '');
}

const body = ORDER.map(m => `/* ---- ${m}.js ---- */\n` + plain(readFileSync(join(here, 'src', m + '.js'), 'utf8'))).join('\n');
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
