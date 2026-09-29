# procedural-line-renderings

Canonical instructions for any coding agent working in this repository.
`AGENTS.md` and `.agents/README.md` point here; do not duplicate content there.

## What this is

Procedural architectural line drawings computed from real geometry and drawn
on a canvas. Four dependency-free Web Components: `<dmg-street-corner>` (a
pinhole-camera street with an `ink` preset), `<dmg-massing>` (axonometric or
perspective boxes), `<dmg-skyline>` (a 3D city block of towers), and
`<dmg-plan>`, plus the generators they use. Every drawing is a pure function
of a 32-bit seed, every drawable feature is a flag in `src/options.js`, and
the three scenes take a `perspective` param (1, 2 or 3 where it makes sense)
through one pinhole camera.

The repository is also a Claude Code plugin. The skill in
`skills/procedural-architecture-lines/` teaches the math and rules and how to
use the components. `.claude-plugin/plugin.json` is the plugin manifest and
`.claude-plugin/marketplace.json` lets the repository be added as a
marketplace.

## Layout

```
src/random.js       seeded generator (mulberry32), clock hash, pick
src/camera.js       axonometric, facade-plane two-point, pinhole camera, face visibility, similarity fit
src/options.js      option schemas: every flag, param (perspective) and preset, with defaults
src/grammar.js      facade split grammar, window families, gap elements
src/millwork.js     trim and roof profiles drawn in facade coordinates
src/ink.js          bay windows, rounded corner, deep cornice, shade hatching, fence, stoop, planters
src/wfc.js          Wave Function Collapse solver (kept for tile and lot decisions; draws nothing)
src/render.js       progress renderer with glows, draw-in, bounce, reduced motion
src/massing.js      box clusters, painter's order, terraces, towers, gables, openings, perspective
src/corner.js       the street corner scene (corner4), perspective 2 or 3, presets
src/skyline.js      the 3D city block skyline, perspective 1, 2 or 3
src/plan.js         the floor plan
src/components.js   the four Web Components, options parsing, snippetFor
src/index.js        public exports
build.mjs           concatenates src/ in dependency order into dist/ and docs/
dist/               the assembled script-tag build, checked in
docs/               the GitHub Pages site: docs, demo, playground.js, research.md
test/smoke.mjs      headless test with a stub canvas
skills/             the agent skill (SKILL.md, snippets.js, COMPONENTS.md)
```

## Build and test

```sh
node build.mjs        # writes dist/ and docs/procedural-line-renderings.js
node test/smoke.mjs   # every generator, every flag, geometry, determinism, dist parity
npm test              # both
```

Run both before every commit. `dist/` and `docs/procedural-line-renderings.js`
are build outputs but are committed, because the Pages site and script-tag
users read them directly. Never edit them by hand.

## Rules

- Vanilla JS only. No framework, no runtime dependencies, no bundler, no
  network calls. The build is a concatenation script and nothing more.
- Determinism: never call `Math.random()` inside a generator. Take a seeded
  function `r` and thread it through. The same seed must give the same
  drawing on every platform. The test asserts this.
- Every feature is a flag. Add it to `src/options.js` with a family, default,
  and description, gate the drawing on it, and the test will require that it
  changes the drawing for at least one seed. The docs tables and playground
  checkboxes are generated from the schema, so they need no edit. Enumerated
  choices (the camera model) are params in `PARAMS`; bundles are `PRESETS`.
- The build concatenates every module into one scope. Top-level names must
  be unique across `src/`; prefix helpers with the module's name when in doubt.
- Perspective is one pinhole camera for every mode. Do not add a second
  projection path; place and aim the camera, pitch it for three-point, and
  fit the result with `fitSimilarity`.
- Every function has a doc comment saying what it takes and returns. Keep
  functions under 50 lines where practical.
- Drawings are lists of items `{fills, glows, strokes}` in draw order. Fills
  are page colour and exist only for hidden-line removal. Glows are window
  polygons `{poly, k}` lit when `k` is under the glow probability. Strokes are
  `[[x0,y0],[x1,y1]]`. Keep fills below glows below strokes.
- Projection is real geometry. Do not fake perspective with skews. Millwork
  is drawn in facade coordinates so it projects through any camera.
- Components draw only inside their own box and never measure sibling text.
- Respect `prefers-reduced-motion` by drawing the finished state once.
- No personal names anywhere: code, comments, commits, docs, examples. The
  git identity for commits is the studio identity `DMG`.
- No emojis. No pricing language.
- Keep the docs page and README under an 80-character body measure.

## Where to change what

- A new flag on an existing generator: `src/options.js`, then the generator.
- A new drawing kind: add a generator module under `src/` taking
  `(r, region, options)`, add its schema to `src/options.js`, export it from
  `src/index.js`, add it to `ORDER` and `EXPORTS` in `build.mjs`, register it
  in `GENERATORS` and `TAGS` in `src/components.js`, add it to `GEN` in
  `test/smoke.mjs` and to `GEN` in `docs/playground.js`, document it in
  `README.md` and `docs/index.html`, and add the technique to the skill. If it
  has no windows, set it false in `GLOW_KINDS`.
- A change to the math: update the skill's `SKILL.md` in the same commit.
- New millwork: read `docs/research.md` first and add the source there.

## License

GPL-3.0, see `LICENSE`.
