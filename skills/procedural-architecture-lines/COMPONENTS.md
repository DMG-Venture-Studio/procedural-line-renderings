# Using the packaged components

Read with SKILL.md in this folder. The `@dmg-venture-studio/procedural-line-renderings`
package (https://github.com/DMG-Venture-Studio/procedural-line-renderings)
ships five finished drawings as Web Components, so a page gets a drawing
without writing any of the math in SKILL.md. Live playgrounds for every flag:
https://dmg-venture-studio.github.io/procedural-line-renderings/

```html
<script src="dist/procedural-line-renderings.js"></script>
<dmg-street-corner style="width:100%;height:60vh"></dmg-street-corner>
<dmg-massing seed="42" mode="once" color="#1F3FCF"></dmg-massing>
<dmg-skyline night></dmg-skyline>
<dmg-truss options='{"warren":false}'></dmg-truss>
<dmg-plan options='{"poche":false}'></dmg-plan>
```

- **Elements:** `dmg-street-corner`, `dmg-massing`, `dmg-skyline`, `dmg-truss`,
  `dmg-plan`.
- **Attributes:** `seed` (fixed integer; absent means hash the clock),
  `reseed` (`cycle` or `never`), `mode` (`bounce` or `once`), `options` (JSON
  of feature flags, only the ones you change), `color`, `page` (hidden-line
  fill colour; match the background), `glow` (hex; lights a random subset of
  windows), `night` (dark page, light lines, glow on). Street corner
  shorthands: `pitch`, `full`.
- **Flags:** every drawable feature is a flag in the library's `OPTIONS`
  schema. Street corner families: camera, massing, windows, ornament,
  millwork (architraves, lintels, shutters, stringCourses, dentils,
  pediments, pilasters, transoms, parapetCaps, fireEscapes), street, depth,
  roof (rooftops, gables, mansards). Massing: terraces, towers, courtyards,
  cantilevers, hatchlight, openings, gables, ground, exploded, randomAngle.
  Read `element.options` for the resolved set; the README lists defaults.
- **Methods and events:** `regenerate()`, `stop()`, the `seed` property, the
  `options` property, the `snippet` property (the tag that reproduces the
  current state), and a `seed` event with `detail.seed` on every draw.
- **Sizing:** the element is a block; give it a width and height, or a width
  and an `aspect-ratio`, and it fits the drawing to that box. Keep text out
  of the box. The element never measures its siblings; placement is the
  page's job. Presets that work: 390 by 300 for phones, 834 by 480 for
  tablets, 1440 by 720 for desktops.
- **Motion:** reduced motion draws the finished state once. Bounce mode with
  no fixed seed reseeds from the clock at the bottom of every cycle. Glows
  redraw each frame with a canvas shadow; prefer `mode="once"` when many
  windows are lit on a large box.

For a drawing the components do not make, import the generators from
`src/index.js` and compose them with `renderTo`, `drawIn`, or `bounce`.
`renderTo(ctx, items, px, {color, page, glow, glowProb})` draws the first
`px` pixels of stroke length.
