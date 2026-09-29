# Using the packaged components

Read with SKILL.md in this folder. The `@dmg-venture-studio/procedural-line-renderings`
package (https://github.com/DMG-Venture-Studio/procedural-line-renderings)
ships four finished drawings as Web Components, so a page gets a drawing
without writing any of the math in SKILL.md. Live playgrounds for every flag:
https://dmg-venture-studio.github.io/procedural-line-renderings/

```html
<script src="dist/procedural-line-renderings.js"></script>
<dmg-street-corner style="width:100%;height:60vh"></dmg-street-corner>
<dmg-massing seed="42" mode="once" color="#1F3FCF"></dmg-massing>
<dmg-skyline night perspective="1"></dmg-skyline>
<dmg-street-corner preset="ink" perspective="3"></dmg-street-corner>
<dmg-massing perspective="2"></dmg-massing>
<dmg-plan options='{"poche":false}'></dmg-plan>
```

- **Elements:** `dmg-street-corner`, `dmg-massing`, `dmg-skyline`, `dmg-plan`.
- **Attributes:** `seed` (fixed integer; absent means hash the clock),
  `reseed` (`cycle` or `never`), `mode` (`bounce` or `once`), `options` (JSON
  of feature flags, only the ones you change), `color`, `page` (hidden-line
  fill colour; match the background), `glow` (hex; lights a random subset of
  windows; ignored by the plan), `night` (dark page, light lines, glow on),
  `perspective` (corner 2 or 3; massing 0, 2 or 3; skyline 1, 2 or 3; one
  pinhole camera for all of them), `preset` (corner: `ink`), `randomize`
  (a fraction; on every seed pick a random subset of the flags with coverage
  between it and 1, pinning any flag set in `options` and never touching
  camera flags). Street corner shorthands: `pitch` (perspective 3), `full`.
- **Flags:** every drawable feature is a flag in the library's `OPTIONS`
  schema. Street corner families: camera, massing, windows, ornament,
  millwork (architraves, lintels, shutters, stringCourses, dentils,
  pediments, pilasters, transoms, parapetCaps, fireEscapes), ink (bays,
  roundedCorner, deepCornice, shadowHatch, fence, stoop, planters, arches),
  street, depth, roof (rooftops, gables, mansards). Massing: terraces, towers,
  courtyards, cantilevers, hatchlight, plus the same windows, ornament,
  millwork, ink, street, depth and roof families as the corner (any one on
  gives every non-tower box a facade on its visible faces), gables, mansards,
  ground, exploded, randomAngle. Skyline: setbacks, podiums, dense, spires,
  domes, masts, crowns, floorLines, mullions, street.
  Read `element.options` for the declared set and `element.resolvedOptions`
  for what was drawn; the README lists defaults.
- **Methods and events:** `regenerate()`, `stop()`, the `seed` property, the
  `options` and `resolvedOptions` properties, the `snippet` property (the tag
  that reproduces the current state; with randomize it carries the fraction,
  not the chosen set), and a `seed` event with `detail.seed` and
  `detail.options` on every draw.
- **A site hero that varies:** `<dmg-street-corner randomize="0.5">` gives a
  different feature mix every cycle with at least half the flags on, the
  camera left as set. **A closing band:** `<dmg-skyline perspective="2" night
  glow mode="bounce" reseed="cycle">` on a black band; `night` supplies the
  black page colour.
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
