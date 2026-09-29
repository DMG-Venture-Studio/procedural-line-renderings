# procedural-line-renderings

Procedural architectural line drawings as dependency-free Web Components. A
street corner seen through a pinhole camera, an axonometric massing model, a
Wave Function Collapse skyline, a bridge truss, and a floor plan, each
computed from a seed and plotted in like a pen plotter. Every feature is a
flag. Vanilla JS, one colour, one pixel wide, no framework, no network, no
build tool beyond a concatenation script.

Docs with live playgrounds for every flag, size, and colour:
https://dmg-venture-studio.github.io/procedural-line-renderings/

## Use

Script tag, no bundler:

```html
<script src="dist/procedural-line-renderings.js"></script>

<dmg-street-corner style="width: 100%; height: 60vh"></dmg-street-corner>
<dmg-massing seed="42" mode="once"></dmg-massing>
<dmg-skyline night></dmg-skyline>
<dmg-street-corner options='{"shutters":true,"pediments":true,"trees":false}' glow="#F2D08A"></dmg-street-corner>
```

ES modules:

```js
import '@dmg-venture-studio/procedural-line-renderings';   // registers the elements
import { corner4, massing3, skyline, truss, plan, rng, bounce } from '@dmg-venture-studio/procedural-line-renderings';
```

The element fills whatever box you give it. Size it with CSS; it redraws when
its box changes. Each playground on the docs page writes the exact tag and
the equivalent API call for whatever is switched on.

## Components

| Element | What it draws |
|---|---|
| `<dmg-street-corner>` | Two rows of buildings at a corner through a pinhole camera: split-grammar facades, five window families, rooftops, gaps, ornament, twelve kinds of millwork, the street in front, optional depth features and a back row. |
| `<dmg-massing>` | Axonometric massing: terraces, towers, courtyards, cantilevers, gables, openings, a drawn site, an exploded view, a light study. Hidden lines removed. |
| `<dmg-skyline>` | A street found by Wave Function Collapse over socketed tiles. |
| `<dmg-truss>` | A Pratt or Warren truss in elevation with gussets, deck, and piers. |
| `<dmg-plan>` | A floor plan by recursive subdivision with door swings, windows, poche, and a stair. |

### Attributes, all components

| Attribute | Values | Default | Meaning |
|---|---|---|---|
| `seed` | integer | none | Fixed seed. When absent, a hash of the clock is used. |
| `reseed` | `cycle`, `never` | `cycle` | In bounce mode with no fixed seed, draw a new sibling at the bottom of each cycle. |
| `mode` | `bounce`, `once` | `bounce` | Plot in, hold, plot out, repeat; or plot in once and stop. |
| `options` | JSON object | none | Feature flags for this component (tables below). Only the flags you set are needed. |
| `color` | CSS colour | `#C4C6CB`, night `#A8AAB0` | Stroke colour. |
| `page` | CSS colour | `#FFFFFF`, night `#0E0E10` | Page colour used for hidden-line fills. Match your background. |
| `glow` | hex colour | off, night `#F2D08A` | Light a random subset of windows in this colour with a soft shadow. |
| `night` | boolean | off | Dark page, light lines, glowing windows on by default and more of them. |
| `pitch` | boolean | off | Street corner shorthand for `options='{"pitch":true}'`. |
| `full` | boolean | off | Street corner shorthand for back row, balconies, awnings, setbacks, close camera. |

### Methods, properties, events

- `element.regenerate()` draws a new sibling from a fresh clock seed.
- `element.stop()` halts the animation and leaves the last frame.
- `element.seed` is the seed of the drawing on screen. Setting it redraws.
- `element.options` is the resolved flags in effect, defaults filled in.
- `element.snippet` is the HTML tag that reproduces the current state.
- A `seed` event fires on every draw with `event.detail.seed`.

Under `prefers-reduced-motion: reduce` the element draws the finished state
once and never animates.

### Flags

Street corner, by family. Defaults in bold.

| Family | Flags |
|---|---|
| camera | **randomCamera**, pitch, closeCamera |
| massing | **gaps**, **towers**, setbacks, backRow |
| windows | **winRect**, **winArch**, **winTall**, **winPaired**, **winGrid** |
| ornament | **brackets**, **quoins**, **keystones**, **rustication** |
| millwork | architraves, lintels, shutters, stringCourses, dentils, pediments, pilasters, transoms, parapetCaps, fireEscapes |
| street | **kerb**, **roadDashes**, **lamps**, **trees** |
| depth | balconies, awnings |
| roof | **rooftops**, gables, mansards |

Massing: **terraces**, **towers**, courtyards, cantilevers, **hatchlight**,
openings, gables, ground, exploded, randomAngle.

Skyline: **windows**, **doors**, **bands**, **cornices**, **streets**.

Truss: **pratt**, **warren**, **doubleLines**, **gussets**, **deck**, **piers**.

Plan: **doors**, **windows**, **poche**, **stair**.

The schema with a description of every flag is `src/options.js`, exported as
`OPTIONS`; the docs page renders its tables from it.

### Sizing

The element is `display: block` with a 240px minimum height. Give it a width
and height, or a width and an `aspect-ratio`, or place it in a grid cell. The
drawing is fitted to the box: the corner's ground lands 30 percent across and
92 percent down, the tallest line 8 percent down; the massing is centred and
bottom-aligned. Keep text out of the box; the drawing does not measure
siblings.

## Generators

Every generator takes a seeded random function, a region, and an options
object, and returns a drawing: a list of items `{fills, glows, strokes}` in
draw order. Fills are page-colour polygons for hidden lines, glows are window
polygons with a random key for lighting, and a stroke is `[[x0, y0], [x1, y1]]`
in canvas px.

| Function | What it makes |
|---|---|
| `corner4(r, region, options)` | The street corner. Also exported as `streetCorner`. |
| `massing3(r, region, options)` | The massing scene. |
| `skyline(r, region, options)` | The WFC skyline. |
| `truss(r, region, options)` | The truss. |
| `plan(r, region, options)` | The floor plan. |
| `massing(r, {count, grid})`, `boxDrawing2(box, iso, u, flags)` | Raw box clusters and their drawings. |
| `facade2(r, proj, opts)`, `gapElement(r, proj, gh)`, `windowOf(type, line, rect)` | The facade grammar pieces on any projection. |
| `wfc(r, tiles, cols, rows, bounds, tries)` | The Wave Function Collapse solver. |
| `makeIso`, `facadePoint`, `pinhole` | Axonometric, facade-plane two-point, and pinhole projections. |
| `renderTo`, `drawIn`, `bounce`, `totalLength`, `speedsFor` | Rendering and the two animation runners. `renderTo` takes `glow` and `glowProb`. |
| `OPTIONS`, `defaults(kind)`, `resolve(kind, opts)`, `diffFromDefaults(kind, opts)` | The option schemas and helpers. |
| `snippetFor(element, kind)` | The HTML that reproduces an element's state. |
| `rng(seed)`, `hashSeed(str)`, `clockSeed(label)`, `pick(r, arr)` | Seeded randomness. |

## The math, briefly

Projection is real geometry, never faked. The massing uses an axonometric
projection and hides lines with the painter's algorithm: boxes are sorted far
to near by the sum of their centre coordinates, and each box fills its
visible faces in the page colour before stroking its edges, so nearer boxes
erase what they cover. The street corner uses a pinhole camera with unit
focal length standing in the negative quadrant of a 3D street, and the result
is fitted to the box with a uniform scale and translation. A similarity
preserves perspective, so perspective strength comes only from how far the
camera stands from the buildings. A pitched camera gives converging verticals.
Millwork is drawn in facade coordinates through the same projection.

Facades come from a split grammar in the tradition of Instant Architecture and
CGA shape: a lot becomes a building, a building becomes floors, floors become
bays, bays become windows from one of five families, and trim is applied per
opening inside that loop. The skyline is a Wave Function Collapse over
socketed tiles. Everything is a pure function of a 32-bit seed from a
mulberry32 generator, so a drawing can be named by its seed and reproduced
anywhere. Plotting animates by stroke length: a progress renderer draws the
first `p` pixels of the stroke list each frame, with each item's fills and lit
windows appearing as the item starts. The sources behind the millwork are in
`docs/research.md`.

## Develop

```sh
npm test      # builds dist, then runs the headless smoke test
npm run build # dist/procedural-line-renderings.js, also copied into docs/
```

The test generates every kind with defaults, every flag on, and every flag off
over six seeds with a stub canvas, checks for non-finite coordinates, proves
each flag changes the drawing for at least one seed, confirms determinism,
exercises the renderer with and without glows, simulates a full bounce cycle
to prove the reseed, and checks the dist build draws the same geometry as
the source.

## For coding agents

The repository is a Claude Code plugin. Its skill,
`skills/procedural-architecture-lines/`, teaches the math, the composition
rules, and how to use the components.

```
/plugin marketplace add DMG-Venture-Studio/procedural-line-renderings
/plugin install procedural-line-renderings
```

Instructions for working on the repository itself are in `CLAUDE.md`.

## License

GPL-3.0, see `LICENSE`.
