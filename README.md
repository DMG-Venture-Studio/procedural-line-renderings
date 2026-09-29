# procedural-line-renderings

Procedural architectural line drawings as dependency-free Web Components. A
street corner seen through a pinhole camera, and an axonometric massing model,
each computed from a seed and plotted in like a pen plotter. Vanilla JS, one
colour, one pixel wide, no framework, no network, no build tool beyond a
concatenation script.

## Use

Script tag, no bundler:

```html
<script src="dist/procedural-line-renderings.js"></script>

<dmg-street-corner style="width: 100%; height: 60vh"></dmg-street-corner>
<dmg-massing seed="42" mode="once"></dmg-massing>
```

ES modules:

```js
import '@dmg-venture-studio/procedural-line-renderings';   // registers both elements
import { corner4, rng, bounce } from '@dmg-venture-studio/procedural-line-renderings';
```

The element fills whatever box you give it. Size it with CSS; it redraws when
its box changes. Docs and a live demo: https://dmg-venture-studio.github.io/procedural-line-renderings/

## Components

`<dmg-street-corner>` draws two rows of buildings meeting at a corner, generated
by a split grammar with five window families, rooftop objects, gaps in the
street wall, ornament (cornice brackets, quoins, keystones, rustication) and
the street in front (kerb, lamp posts, trees from a branching rule).

`<dmg-massing>` draws stacked terraces with railings and stairs, a few towers
with floor lines and mullions, and a light study in three hatch weights, with
hidden lines removed.

### Attributes

| Attribute | Values | Default | Meaning |
|---|---|---|---|
| `seed` | integer | none | Fixed seed. When absent, a hash of the clock is used. |
| `reseed` | `cycle`, `never` | `cycle` | In bounce mode with no fixed seed, draw a new sibling at the bottom of each cycle. |
| `mode` | `bounce`, `once` | `bounce` | Plot in, hold, plot out, repeat; or plot in once and stop. |
| `pitch` | boolean | off | Street corner only. Tilt the camera up for three-point perspective. |
| `full` | boolean | off | Street corner only. The crowded recipe: back row, balconies, awnings, setbacks, closer camera. |
| `color` | CSS colour | `#C4C6CB` | Stroke colour. |
| `page` | CSS colour | `#FFFFFF` | Page colour used for hidden-line fills. Match your background. |

### Methods and events

- `element.regenerate()` draws a new sibling from a fresh clock seed.
- `element.stop()` halts the animation and leaves the last frame.
- `element.seed` is the seed of the drawing on screen. Setting it redraws.
- A `seed` event fires on every draw with `event.detail.seed`, so a page can
  show or record it.

Under `prefers-reduced-motion: reduce` the element draws the finished state
once and never animates.

### Sizing

The element is `display: block` with a 240px minimum height. Give it a width
and height, or place it in a grid cell. The drawing is fitted to the box: the
corner's ground lands 30 percent across and 92 percent down, the tallest line
8 percent down; the massing is centred and bottom-aligned. Keep text out of
the box; the drawing does not measure siblings.

## Generators

Every generator takes a seeded random function and a region, and returns a
drawing: a list of items `{fills, strokes}` in draw order, where a stroke is
`[[x0, y0], [x1, y1]]` in canvas px.

| Function | What it makes |
|---|---|
| `corner4(r, region, {pitch, full})` | The street corner. Also exported as `streetCorner`. |
| `massing3(r, region, {terraces, towers, hatchlight})` | The massing scene. |
| `massing(r, {count, grid})` and `boxDrawing2(box, iso, u, flags)` | Raw box clusters and their drawings. |
| `facade2(r, proj, opts)`, `gapElement(r, proj, gh)`, `windowOf(type, line, rect)` | The facade grammar pieces on any projection. |
| `wfc(r, tiles, cols, rows, bounds, tries)` | A Wave Function Collapse solver over socketed tiles. |
| `makeIso`, `facadePoint`, `pinhole` | Axonometric, facade-plane two-point, and pinhole projections. |
| `renderTo`, `drawIn`, `bounce`, `totalLength`, `speedsFor` | Rendering and the two animation runners. |
| `rng(seed)`, `hashSeed(str)`, `clockSeed(label)`, `pick(r, arr)` | Seeded randomness. |

## The math, briefly

Projection is real geometry, never faked. The massing uses an axonometric
projection at 30 degrees, and hides lines with the painter's algorithm: boxes
are sorted far to near by the sum of their centre coordinates, and each box
fills its three visible faces in the page colour before stroking its edges, so
nearer boxes erase what they cover. The street corner uses a pinhole camera
with unit focal length standing in the negative quadrant of a 3D street, and
the result is fitted to the box with a uniform scale and translation. A
similarity preserves perspective, so perspective strength comes only from how
far the camera stands from the buildings, which is the honest control. A
pitched camera gives converging verticals.

Facades come from a split grammar in the tradition of Instant Architecture and
CGA shape: a lot becomes a building, a building becomes floors, floors become
bays, bays become windows from one of five families, and every split preserves
the area it came from. Everything is a pure function of a 32-bit seed from a
mulberry32 generator, so a drawing can be named by its seed and reproduced
anywhere. Plotting animates by stroke length: a progress renderer draws the
first `p` pixels of the stroke list each frame, with each item's fills appearing
as the item starts, so hidden-line removal holds mid-plot.

## Develop

```sh
npm test      # builds dist, then runs the headless smoke test
npm run build # dist/procedural-line-renderings.js, also copied into docs/
```

The test generates every kind over six seeds with a stub canvas, checks for
non-finite coordinates and sensible stroke counts, confirms determinism,
exercises the renderer, simulates a full bounce cycle to prove the reseed
fires, and evaluates the dist build against the source. No dependencies.

## For coding agents

`skills/procedural-architecture-lines/` is a skill: the math, the composition
rules, and how to use these components. Two ways to get it:

- Install this repository as a Claude Code plugin. In Claude Code:
  `/plugin marketplace add DMG-Venture-Studio/procedural-line-renderings`
  then `/plugin install procedural-line-renderings`. The manifests are in
  `.claude-plugin/`.
- Or copy the skill directory into a project's `.claude/skills/`.

Agent instructions for working on this repository itself are in `CLAUDE.md`.
`AGENTS.md` and `.agents/` point there.

## License

GPL-3.0. See `LICENSE`.
