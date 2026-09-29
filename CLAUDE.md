# procedural-line-renderings

Canonical instructions for any coding agent working in this repository.
`AGENTS.md` and `.agents/README.md` point here; do not duplicate content there.

## What this is

Procedural architectural line drawings computed from real geometry and drawn
on a canvas: a street corner seen through a pinhole camera, and an axonometric
massing model. Shipped as two dependency-free Web Components,
`<dmg-street-corner>` and `<dmg-massing>`, plus the generators they use. Every
drawing is a pure function of a 32-bit seed.

The repository is also a Claude Code plugin. The skill in
`skills/procedural-architecture-lines/` teaches the math and rules and how to
use the components. `.claude-plugin/plugin.json` is the plugin manifest and
`.claude-plugin/marketplace.json` lets the repository be added as a
marketplace.

## Layout

```
src/random.js       seeded generator (mulberry32), clock hash, pick
src/camera.js       axonometric, facade-plane two-point, pinhole projections
src/grammar.js      facade split grammar, window families, gap elements
src/wfc.js          Wave Function Collapse solver over socketed tiles
src/massing.js      box clusters, painter's order, hatching, terraces, towers
src/corner.js       the street corner scene (corner4)
src/render.js       progress renderer, draw-in, bounce runner, reduced motion
src/components.js   the two Web Components
src/index.js        public exports
build.mjs           concatenates src/ in dependency order into dist/ and docs/
dist/               the assembled script-tag build, checked in
docs/               the GitHub Pages site: docs page, demo, the built script
test/smoke.mjs      headless test with a stub canvas
skills/             the agent skill (SKILL.md, snippets.js, COMPONENTS.md)
```

## Build and test

```sh
node build.mjs        # writes dist/ and docs/procedural-line-renderings.js
node test/smoke.mjs   # generates every kind over several seeds, checks geometry
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
- Every function has a doc comment saying what it takes and returns. Keep
  functions under 50 lines where practical.
- Drawings are lists of items `{fills, strokes}` in draw order. Fills are page
  colour and exist only for hidden-line removal. Strokes are `[[x0,y0],[x1,y1]]`.
- Projection is real geometry. Do not fake perspective with skews.
- Components draw only inside their own box and never measure sibling text.
- Respect `prefers-reduced-motion` by drawing the finished state once.
- No personal names anywhere: code, comments, commits, docs, examples. The
  git identity for commits is the studio identity `DMG`.
- No emojis. No pricing language.
- Keep the docs page and README under an 80-character body measure.

## Where to change what

- A new drawing kind: add a generator module under `src/`, export it from
  `src/index.js`, add it to `ORDER` and `EXPORTS` in `build.mjs`, register a
  generator in `src/components.js` if it should be an element, add a case to
  `test/smoke.mjs`, document it in `README.md` and `docs/index.html`, and add
  the technique to the skill.
- A change to the math: update the skill's `SKILL.md` in the same commit.

## License

GPL-3.0, see `LICENSE`.
