# procedural-line-renderings

Procedural architectural line drawings as dependency-free Web Components. A
street corner seen through a pinhole camera, a massing model, a city-block
skyline, and a floor plan, each computed from a seed and plotted in like a pen
plotter. Every feature is a flag; the three scenes take a perspective mode.
Vanilla JS, one colour, one pixel wide, no framework, no network, no build
tool beyond a concatenation script.

Docs with live playgrounds for every flag, size, colour, and camera:
https://dmg-venture-studio.github.io/procedural-line-renderings/

## Use

Script tag, no bundler:

```html
<script src="dist/procedural-line-renderings.js"></script>

<dmg-street-corner style="width: 100%; height: 60vh"></dmg-street-corner>
<dmg-street-corner preset="ink" perspective="3"></dmg-street-corner>
<dmg-massing seed="42" mode="once" perspective="2"></dmg-massing>
<dmg-skyline night perspective="1"></dmg-skyline>
<dmg-street-corner options='{"shutters":true,"pediments":true,"trees":false}' glow="#F2D08A"></dmg-street-corner>
```

ES modules:

```js
import '@dmg-venture-studio/procedural-line-renderings';   // registers the elements
import { corner4, massing3, skyline, plan, rng, bounce } from '@dmg-venture-studio/procedural-line-renderings';
```

The element fills whatever box you give it. Size it with CSS; it redraws when
its box changes. Each playground on the docs page writes the exact tag and
the equivalent API call for whatever is switched on.

## Components

| Element | What it draws |
|---|---|
| `<dmg-street-corner>` | Two rows of buildings at a corner through a pinhole camera: split-grammar facades, five window families, rooftops, gaps, ornament, twelve kinds of millwork, the street in front, optional depth features and a back row, and an `ink` preset with bay windows, a rounded corner, a deep cornice, shade hatching, a fence, stoops, planters and arches. Two- or three-point. |
| `<dmg-massing>` | A massing model: terraces, towers, courtyards, cantilevers, gables, openings, a drawn site, an exploded view, a light study. Axonometric by default, or two- or three-point through the pinhole camera. Hidden lines removed. |
| `<dmg-skyline>` | A 3D city block of towers with setbacks, spires, domes, masts and columned crowns, every visible face carrying floor lines and mullions. One-point down an avenue, two-point from a corner, or three-point looking up. |
| `<dmg-plan>` | A floor plan by recursive subdivision with door swings, windows, poche, and a stair. |

### Attributes, all components

| Attribute | Values | Default | Meaning |
|---|---|---|---|
| `seed` | integer | none | Fixed seed. When absent, a hash of the clock is used. |
| `reseed` | `cycle`, `never` | `cycle` | In bounce mode with no fixed seed, draw a new sibling at the bottom of each cycle. |
| `mode` | `bounce`, `once` | `bounce` | Plot in, hold, plot out, repeat; or plot in once and stop. |
| `perspective` | see below | per component | The camera model. Not on the plan. |
| `preset` | `ink` | none | Street corner only: a named bundle of flags. Flags in `options` override it. |
| `options` | JSON object | none | Feature flags for this component (tables below). Only the flags you set are needed. |
| `color` | CSS colour | `#C4C6CB`, night `#A8AAB0` | Stroke colour. |
| `page` | CSS colour | `#FFFFFF`, night `#0E0E10` | Page colour used for hidden-line fills. Match your background. |
| `glow` | hex colour | off, night `#F2D08A` | Light a random subset of windows in this colour with a soft shadow. Ignored by the plan, which has no windows. |
| `night` | boolean | off | Dark page, light lines, glowing windows on by default and more of them. |
| `pitch` | boolean | off | Street corner shorthand for `perspective="3"`. |
| `full` | boolean | off | Street corner shorthand for back row, balconies, awnings, setbacks, close camera. |

### Perspective

| Component | `perspective` | Meaning |
|---|---|---|
| Street corner | `2` (default) | Camera level; verticals stay vertical, horizontals converge on two points. |
| Street corner | `3` | Camera pitched up; verticals converge as well. |
| Street corner | `1` | Not supported (a corner has two facade directions). Falls back to 2 with a console warning. |
| Massing | `0` (default) | Axonometric, 30 degrees or `randomAngle`. |
| Massing | `2` | Pinhole camera above and outside the cluster, level. |
| Massing | `3` | Pinhole camera low and pitched up. |
| Skyline | `1` | On the avenue axis at street level; towers on both sides converge on one point. |
| Skyline | `2` (default) | From a street corner outside the block. |
| Skyline | `3` | Street level between towers, pitched up; floor lines read as heavy hatching. |

All modes go through the same pinhole camera in `src/camera.js`. The image is
fitted to the box with a uniform scale, which preserves perspective.

### Methods, properties, events

- `element.regenerate()` draws a new sibling from a fresh clock seed.
- `element.stop()` halts the animation and leaves the last frame.
- `element.seed` is the seed of the drawing on screen. Setting it redraws.
- `element.options` is the resolved flags and params in effect.
- `element.snippet` is the HTML tag that reproduces the current state.
- A `seed` event fires on every draw with `event.detail.seed`.

Under `prefers-reduced-motion: reduce` the element draws the finished state
once and never animates.

### Flags

Street corner, by family. Defaults in bold.

| Family | Flags |
|---|---|
| camera | **randomCamera**, closeCamera |
| massing | **gaps**, **towers**, setbacks, backRow |
| windows | **winRect**, **winArch**, **winTall**, **winPaired**, **winGrid** |
| ornament | **brackets**, **quoins**, **keystones**, **rustication** |
| millwork | architraves, lintels, shutters, stringCourses, dentils, pediments, pilasters, transoms, parapetCaps, fireEscapes |
| ink | bays, roundedCorner, deepCornice, shadowHatch, fence, stoop, planters, arches |
| street | **kerb**, **roadDashes**, **lamps**, **trees** |
| depth | balconies, awnings |
| roof | **rooftops**, gables, mansards |

The `ink` preset turns on every ink flag plus dentils, brackets, architraves
and balconies, turns off towers, gaps, the back row and rooftops, and stands
the camera close, which together approximate a pen-and-ink corner house.

Massing: **terraces**, **towers**, courtyards, cantilevers, **hatchlight**,
openings, gables, ground, exploded, randomAngle.

Skyline: **setbacks**, **podiums**, dense, **spires**, **domes**, **masts**,
**crowns**, **floorLines**, **mullions**, **street**.

Plan: **doors**, **windows**, **poche**, **stair**.

The schema with a description of every flag is `src/options.js`, exported as
`OPTIONS`, `PARAMS`, and `PRESETS`; the docs page renders its tables from it.

### Sizing

The element is `display: block` with a 240px minimum height. Give it a width
and height, or a width and an `aspect-ratio`, or place it in a grid cell. The
drawing is fitted to the box: the corner's ground lands 30 percent across and
92 percent down, the tallest line 8 percent down; the massing and skyline are
centred and bottom-aligned. Keep text out of the box; the drawing does not
measure siblings.

### Night

`night` on an element switches its own palette. The docs page also carries a
page-wide toggle that switches the page tokens and every element on it; each
playground can still override with its own day or night setting.

## Generators

Every generator takes a seeded random function, a region, and an options
object, and returns a drawing: a list of items `{fills, glows, strokes}` in
draw order. Fills are page-colour polygons for hidden lines, glows are window
polygons with a random key for lighting, and a stroke is `[[x0, y0], [x1, y1]]`
in canvas px.

| Function | What it makes |
|---|---|
| `corner4(r, region, options)` | The street corner. Also exported as `streetCorner`. Options include `perspective` and `preset`. |
| `massing3(r, region, options)` | The massing scene. Options include `perspective`. |
| `skyline(r, region, options)` | The city-block skyline. Options include `perspective`. |
| `plan(r, region, options)` | The floor plan. |
| `massing(r, {count, grid})`, `boxDrawing2(box, proj, u, flags)` | Raw box clusters and their drawings. |
| `facade2(r, proj, opts)`, `gapElement(r, proj, gh)`, `windowOf(type, line, rect)` | The facade grammar pieces on any projection. |
| `wfc(r, tiles, cols, rows, bounds, tries)` | The Wave Function Collapse solver, kept for lot and tile decisions. |
| `makeIso`, `facadePoint`, `pinhole`, `facesCamera`, `fitSimilarity` | Projections, a face visibility test, and the similarity fit. |
| `renderTo`, `drawIn`, `bounce`, `totalLength`, `speedsFor` | Rendering and the two animation runners. `renderTo` takes `glow` and `glowProb`. |
| `OPTIONS`, `PARAMS`, `PRESETS`, `GLOW_KINDS`, `defaults(kind)`, `resolve(kind, opts)`, `diffFromDefaults(kind, opts)` | The option schemas and helpers. |
| `snippetFor(element, kind)` | The HTML that reproduces an element's state. |
| `rng(seed)`, `hashSeed(str)`, `clockSeed(label)`, `pick(r, arr)` | Seeded randomness. |

## The math, briefly

Projection is real geometry, never faked. Every perspective mode is the same
pinhole camera with unit focal length, placed and aimed differently, with an
upward pitch for three-point. The result is fitted to the box with a uniform
scale and translation. A similarity preserves perspective, so perspective
strength comes only from how far the camera stands from the buildings. The
axonometric massing uses a parallel projection instead. Hidden lines are
removed by the painter's algorithm: boxes are sorted far to near, each fills
its visible faces in the page colour before stroking its edges, and nearer
boxes erase what they cover. Visibility of a face is a dot product of its
normal with the direction to the camera. Millwork and the ink features are
drawn in facade coordinates, with a depth axis for anything that projects
from the wall, through the same camera.

Facades come from a split grammar in the tradition of Instant Architecture and
CGA shape: a lot becomes a building, a building becomes floors, floors become
bays, bays become windows from one of five families, and trim is applied per
opening inside that loop. The skyline is a city block: lots on a grid, or on
both sides of an avenue for one-point, each with a tower of stacked setback
tiers and a crown. Everything is a pure function of a 32-bit seed from a
mulberry32 generator, so a drawing can be named by its seed and reproduced
anywhere. Plotting animates by stroke length: a progress renderer draws the
first `p` pixels of the stroke list each frame, with each item's fills and lit
windows appearing as the item starts. The sources behind the millwork and the
ink features are in `docs/research.md`.

## Develop

```sh
npm test      # builds dist, then runs the headless smoke test
npm run build # dist/procedural-line-renderings.js, also copied into docs/
```

The test generates every kind with defaults, every flag on, and every flag off
in every perspective over six seeds with a stub canvas, checks for non-finite
coordinates, proves each flag and each perspective changes the drawing, checks
the presets and the plan's lack of glow, confirms determinism, exercises the
renderer with and without glows, simulates a full bounce cycle to prove the
reseed, and checks the dist build draws the same geometry as the source.

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
