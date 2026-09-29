---
name: procedural-architecture-lines
description: Generate architectural line drawings procedurally in vanilla JS on canvas, from real geometry: axonometric and two-point perspective projection, split grammars for facades, painter's-order hidden-line removal, parametric hatching, and plotter-style draw-in animation. Use when a page needs a drawn structure as a background or figure, when the user asks for "architectural", "isometric", "blueprint", "section", "elevation", or "line drawing" visuals, or when a generative graphic must be reproducible from a seed and dependency-free.
---

# Procedural architectural line drawings

Line drawings of buildings that are computed, not drawn. Everything comes from a
seed, a projection, and a grammar, so the same seed gives the same drawing and
a new seed gives a sibling. Output is strokes on a 2D canvas, which makes it
cheap, printable, and free of dependencies.

## When to reach for this

- A background or figure that should read as one object, not a texture. Texture
  behind text itches; a single drawn structure sits still.
- A visual that must be reproducible (seeded) and shippable as plain JS.
- Any of: massing studies, facades, sections, plans, isometric machines.

## Building blocks

### 1. Seeded randomness

Never use `Math.random()` in the drawing. Use a small seeded generator so a
seed identifies a drawing and the animation can replay it.

```js
function rng(seed) {            // mulberry32
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var r = rng(42);
function pick(arr) { return arr[Math.floor(r() * arr.length)]; }
function between(a, b) { return a + (b - a) * r(); }
```

### 2. Projections

**Axonometric (isometric).** World axes x, y on the ground, z up. The viewer
stands at +x, +y, +z. With unit length `u`:

```js
var C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6);   // 30 degrees
function iso(x, y, z) { return [ox + (x - y) * C * u, oy + (x + y) * S * u - z * u]; }
```

Faces visible from that viewpoint are the +x face, the +y face, and the top
(+z) face. Use a dimetric angle (for example 20 and 40 degrees) when true
isometric looks too diagrammatic.

**Two-point perspective for a vertical plane.** For a facade running from a
corner toward a vanishing point, a point at distance `d` along the facade and
height `h` projects as:

```js
// cx, groundY: the corner on screen. vpx: vanishing point x. hy: horizon y.
// D0: how fast the facade recedes (bigger = flatter). scale: px per metre at the corner.
function facadePoint(d, h, vpx, cx, groundY, hy, D0, scale) {
  var t = d / (d + D0);
  var x = cx + (vpx - cx) * t;
  var yc = groundY - h * scale;              // that height at the corner
  var y = hy + (yc - hy) * (1 - t);          // shrinks toward the horizon
  return [x, y];
}
```

Verticals stay vertical, horizontals converge, and heights shrink correctly.
Two facades sharing a corner with vanishing points on opposite sides give a
street corner. This is exact for points on the facade plane and nothing else.

**Pinhole camera, when anything leaves the plane.** Balconies, awnings, trees
on the pavement, and a second row of buildings behind the first all need real
3D. Put the corner at the origin, one street along +X and the other along +Y,
Z up, and a camera in the negative quadrant looking at the corner:

```js
function camera(C, T, pitch) {          // C: camera position, T: aim point
  var f = norm([T[0] - C[0], T[1] - C[1], pitch]);        // pitch 0 = two-point
  var rt = norm(cross(f, [0, 0, 1])), up = cross(rt, f);
  return function (P) {
    var v = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], z = dot(v, f);
    return [dot(v, rt) / z, -dot(v, up) / z];              // unit focal length
  };
}
```

Use unit focal length and fit the result to the region afterwards with a 2D
similarity (uniform scale plus translation). A similarity preserves
perspective, so the focal length never needs choosing. Perspective strength
then comes only from how far the camera stands from the buildings, which is
the physically honest control. A non-zero pitch gives three-point perspective
with converging verticals.

### 3. Split grammar for facades

The Instant Architecture and CGA-shape approach: a facade is a rectangle that
is split recursively, and every split preserves the area it came from.

```
Lot        -> Building(height = floors * floorH)
Building   -> Ground | Floor* | Cornice
Floor      -> Bay*                 (repeat a bay width across, absorb remainder)
Bay        -> Wall | Window        (window = inset rectangle, sill line)
Ground     -> Bay* with one Door
```

Implement as functions that take a rectangle in facade coordinates (d, h) and
emit strokes. Vary per building: floor count, floor height, bay width, window
proportions, ground floor height, cornice depth. Keep the alphabet small; the
variety comes from parameters, not new rules.

### 4. Hidden-line removal on canvas

For axis-aligned boxes in axonometric view, painter's order works: sort boxes
by the sum of their centre coordinates (x + y + z) ascending, draw far to near,
and for each box **fill its three visible faces with the page colour before
stroking their edges**. Nearer boxes paint over the edges of farther ones,
which is exactly hidden-line removal at zero cost. Rare mis-orders on
touching boxes are acceptable in a background; if not, split boxes until none
overlap in projection.

For arbitrary meshes, that trick fails; use a proper hidden-line algorithm
(Appel, or per-segment occlusion tests) or accept a wireframe.

### 5. Hatching without clipping

A parallelogram face with origin P and edge vectors U and V takes hatch lines
parallel to V at spacing `s` along U:

```js
for (var k = s; k < len(U); k += s) {
  var a = P + U * (k / len(U));     // vector maths in 2D
  stroke(a, a + V);
}
```

No `clip()` needed, and the lines are part of the stroke list, so they animate
with everything else. Use hatching for one face orientation only; it reads as
light direction.

### 6. Wave Function Collapse for tile and lot decisions

WFC fills a grid with tiles so that every shared edge agrees. Give each tile
four socket labels (T, R, B, L); two tiles may touch when the facing sockets
match. Constrain the grid edges (sky at the top, ground at the bottom, sky at
the sides) and the algorithm produces a skyline of buildings with roofs above
walls and doors only at street level, without a single hand-placed line.

- Keep the alphabet small: sky, street, roof, wall variants, door. Generate
  the left and right edge variants programmatically.
- Draw exterior edges by comparing neighbours after collapse (a wall next to
  sky gets a line), and let tiles draw only their interiors.
- Pick the lowest-entropy cell, collapse it by weight, propagate. On a
  contradiction, restart with the same generator. Twenty tries is plenty for
  a 40 by 14 grid.

### 7. Draw-in and bounce

Collect every stroke in drawing order (far to near, outlines before hatching)
and sum the lengths. Render by progress: clear, then draw strokes up to a
length `p`, with each item's page-colour fills appearing as the item starts.
Advancing `p` at about 2,000 px per second reads as a plotter.

Two modes:

- **Draw in and stop.** Advance to the total, then stop the loop. A finished
  drawing costs nothing.
- **Bounce.** Draw in, hold a few seconds, draw out at a faster rate, hold
  briefly, repeat. Continuous, but the page is still most of the time. Use
  when the owner wants the drawing to keep living. With `onEmpty`, supply a
  fresh drawing from a new clock hash at the bottom of every cycle, so the
  page never repeats and never jumps.

`prefers-reduced-motion` renders the finished drawing once in both modes.
Regenerate only on reload or a deliberate trigger.

### 8. Seeding from the clock

Hash the browser time (FNV-1a over `Date.now()` as a string) into the seed so
every visit gets a sibling drawing and the seed can be shown and quoted.

### 9. Composition rules for backgrounds

- One structure, placed like an object: anchored to an edge, cropped by it.
  Do not tile.
- Never behind the text. Measure the copy column at runtime and give the
  drawing the region beside it; at phone width give it the region below.
- Stroke `1px` at device resolution. One colour, roughly 25 to 35 percent grey
  on white (`#C4C6CB` on `#FFFFFF`). No fills other than page colour.
- No labels, dimensions, or north arrows. Those turn abstraction into a
  document and start signalling an industry.

## Snippets that compose

`snippets.js` next to this file holds the seeded RNG, the clock hash, the two
projections, a box massing generator, a facade grammar, a Wave Function
Collapse solver, the progress renderer, and the bounce runner, each as a
standalone function you can paste into a page.

## References

- Wonka, Wimmer, Sillion, Ribarsky. Instant Architecture (2003). The split
  grammar idea. https://paperswelove.org/papers/instant-architecture-3e1d85a7/
- Müller, Wonka, Haegler, Ulmer, Van Gool. Procedural Modeling of Buildings
  (2006). CGA shape, the basis of CityEngine.
  https://dl.acm.org/doi/10.1145/1141911.1141931
- Kjetil Golid's open-source generators, including apparatus-generator for
  isometric box structures. https://github.com/kgolid
- Hidden-line removal overview. https://en.wikipedia.org/wiki/Hidden-line_removal
- Plotter-art tooling and technique list. https://github.com/beardicus/awesome-plotters

## Using the packaged components

See COMPONENTS.md next to this file for the `<dmg-street-corner>` and
`<dmg-massing>` elements: attributes, methods, events, sizing, and motion.

### 10. Every feature is a flag

Keep an option schema next to the generators: each flag with a family, a
default, and a one-line description. Generators resolve their options
against it, the documentation renders its tables from it, and the test
toggles every entry and requires that each one changes the drawing for at
least one seed. A feature that changes nothing is a bug, not a default.

Millwork belongs in facade coordinates (distance along the wall, height,
projection outward), drawn through the same `line` and `rect` helpers as the
windows, so an architrave or a pediment recedes correctly under any camera.
The vocabulary worth drawing as lines: architraves, lintels, shutters,
string courses, dentils, pediments, pilasters, transoms, parapet caps, fire
escapes, gable and mansard profiles. Finer texture (glazing bars, brick
coursing) does not read at one pixel and is left out.

### 11. Night and glow

A drawing on a dark page is the same strokes in a light colour with the
page-colour fills switched to the dark. Lit windows are the window polygons
kept as a third list on each item, `{poly, k}` with `k` a random key drawn at
generation time, filled with a glow colour under a soft canvas shadow when
`k` is below a probability. Keep fills below glows below strokes so the lines
stay crisp.

### 12. Perspective modes through one camera

One-, two- and three-point perspective are not three projections. They are
the same pinhole camera placed and aimed differently:

- **One-point:** the camera looks straight down an axis of the scene (an
  avenue). Every line parallel to that axis converges on one point; lines
  across it stay horizontal. Use it for streets and corridors.
- **Two-point:** the camera is level and turned to the scene's axes. Lines
  along either axis converge on their own point; verticals stay vertical.
  Use it for corners and for a model seen from outside.
- **Three-point:** pitch the camera up (or down). Verticals converge on a
  third point above (or below). Use it for towers seen from the street.

Fit every result to the box with a similarity, never a stretch. A corner
cannot be one-point, because it has two facade directions; reject the value
with a warning and fall back.

### 13. A city block as stacked boxes

A skyline that reads as a city is a plan of lots, not a row of rectangles.
Lay lots on a grid (or on both sides of an avenue for one-point), give each
a tower of stacked tiers that step in as they rise, or a low podium, and pick
a crown per tower: flat, spire, dome as rings and meridians, mast, or a ring
of columns under a cap. Draw only faces that face the camera (a dot product
of the face normal with the direction to the camera), fill each in page
colour far to near, then stroke its edges, a line at every floor, mullions on
glass, a spandrel line on masonry. Floor lines are what make a skyline read
as glazing in ink; three to six thousand strokes at desktop size is the
range that looks dense without smearing.

### 14. Ink

Pen-and-ink references read dark because of shade, not outline. Hatch the
band under every projection (cornice, bay, balcony), the head and one jamb of
every opening, and the soffit of a deep cornice, as parallel line fields at
0.12 to 0.16 units. Give a sun side per seed and keep it consistent. Bays,
stoops and cornices project from the wall, so draw them as their own items
with page-colour fills, right after the wall they sit on, or the wall's lines
will show through them.
