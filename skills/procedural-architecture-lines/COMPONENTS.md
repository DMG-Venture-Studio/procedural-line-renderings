# Using the packaged components

Read with SKILL.md in this folder. The `@dmg-venture-studio/procedural-line-renderings` package (in
`labs/procedural-lines/`) ships the two finished drawings as Web Components,
so a page gets a drawing without writing any of the math in SKILL.md.

```html
<script src="dist/procedural-line-renderings.js"></script>
<dmg-street-corner style="width:100%;height:60vh"></dmg-street-corner>
<dmg-massing seed="42" mode="once" color="#1F3FCF"></dmg-massing>
```

- **Attributes:** `seed` (fixed integer; absent means hash the clock),
  `reseed` (`cycle` or `never`), `mode` (`bounce` or `once`), `pitch`
  (three-point, corner only), `full` (the crowded recipe, corner only),
  `color`, `page` (hidden-line fill colour; match the background).
- **Methods and events:** `regenerate()`, `stop()`, the `seed` property, and a
  `seed` event with `detail.seed` on every draw.
- **Sizing:** the element is a block; give it a width and height with CSS and
  it fits the drawing to that box. Keep text out of the box. The element never
  measures its siblings; placement is the page's job.
- **Motion:** reduced motion draws the finished state once. Bounce mode with
  no fixed seed reseeds from the clock at the bottom of every cycle.

For a drawing the components do not make, import the generators from
`src/index.js` and compose them with `renderTo`, `drawIn`, or `bounce`.
