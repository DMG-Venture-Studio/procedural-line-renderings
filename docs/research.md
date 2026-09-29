# Research notes

What was read before adding the millwork and the extra generators, and what
each source contributed. Everything here is drawn as lines from the existing
facade grammar, in facade coordinates, so it projects correctly through any
camera.

## Facade vocabulary

Preservation glossaries were the most useful source, because they define
elements by where they sit on a wall, which is what a grammar needs.

- Boston Landmarks Commission, Glossary of architectural terms.
  https://www.cityofboston.gov/images_documents/Glossary_tcm3-17358.pdf
- Pennsylvania Historical and Museum Commission, Dictionary of architectural
  terms. https://www.phmc.state.pa.us/portal/communities/architecture/resources/dictionary.html
- St. Louis Cultural Resources Office, Glossary of terms.
  https://dynamic.stlouis-mo.gov/history/glossary.cfm
- Wikipedia, Entablature and Dentil.
  https://en.wikipedia.org/wiki/Entablature and https://en.wikipedia.org/wiki/Dentil

Taken from them and now flags on the street corner:

| Element | What it is | How it is drawn |
|---|---|---|
| Architrave | The moulded surround of an opening | A second rectangle 0.12 units outside each window |
| Lintel | The flat member spanning an opening | A slim bar over each window, a little wider than it |
| Shutters | Louvred leaves flanking a window | Two rectangles beside each window with two louvre lines |
| String course | A shallow band continued across the facade | Two lines at the base of every upper floor |
| Dentils | A row of small blocks under a cornice | Small rectangles at 0.36-unit spacing under the cornice line |
| Pediment | A low triangle over an opening | A base line and two rakes over some windows |
| Pilaster | A flat column against the wall | A strip between bays with capital and base lines |
| Transom | The light over a door or shopfront | A horizontal split with two mullions above it |
| Parapet cap | The coping on top of a parapet | A slab slightly wider than the wall |
| Fire escape | Iron platforms and stairs on a facade | Platforms with railings at each floor and a zigzag stair |
| Gable | A triangular roof end | A ridge a quarter of the width up |
| Mansard | A steep lower roof slope with dormers | A trapezoid storey with two or three dormers |

Not drawn, judged not to read as lines at this scale: window glazing bars
finer than the grid family, rubble and brick coursing, ironwork patterns on
balconies beyond the posts, and decorative capitals on pilasters.

## Generation techniques

- Wonka, Wimmer, Sillion, Ribarsky. Instant Architecture (2003). The split
  grammar that the facade generator follows.
  https://paperswelove.org/papers/instant-architecture-3e1d85a7/
- Mueller, Wonka, Haegler, Ulmer, Van Gool. Procedural Modeling of Buildings
  (2006). CGA shape; context-sensitive rules and the idea that facade elements
  need to know their neighbours, which is why trim is applied per opening from
  the bay loop rather than as a separate pass.
  https://dl.acm.org/doi/10.1145/1141911.1141931
- Zweig, Procedural Architectural Facade Modeling (Brown, 2013). A layered,
  grid-based view of facade elements that matches the window, sill, trim
  layering used here. https://cs.brown.edu/research/pubs/theses/ugrad/2013/zweig.pdf
- Jesus et al., Layered Shape Grammars for Procedural Modelling of Buildings.
  Layers as a way to keep ornament separable from structure, which is what the
  per-flag design does. https://scispace.com/pdf/layered-shape-grammars-for-procedural-modelling-of-buildings-2fd7z6s0mf.pdf
- Wave Function Collapse, as used for the skyline: a constraint solver over
  socketed tiles. https://github.com/mxgmn/WaveFunctionCollapse

The plan generator is direct geometry: a recursive subdivision with door
swings drawn as quarter circles.

## Ink references

Two hand-drawn references were read for the `ink` preset: a pen-and-ink
Victorian corner house and a sketch of a small modern villa.

| Seen in the references | How it is approximated as lines |
|---|---|
| Curved bay windows stacked over three floors | A half-ellipse plan polyline of six segments; a pane per segment per floor with its own glow polygon; rings at every floor; corbel brackets under the bay |
| The rounded corner with windows wrapping round | A quarter-round plan of eight segments between the two first buildings, with floor rings, mullions at every vertex, and an arched entrance in the middle segment |
| Deep bracketed cornice with dentils | A projecting soffit of 0.8 units with a hatched underside at 0.14-unit spacing, brackets every 0.7 units, and a dentil row set 0.35 units out |
| Heavy shade under every projection and in the reveals | Parallel line fields: vertical under heads and projections, horizontal on the shaded jamb, with a sun side chosen per seed |
| Iron fence with finials, gate opposite the door | Posts every unit with a diamond finial, two rails, pickets every 0.25 units, a gap with taller posts at each door |
| Stoop with cheek walls | Four treads and risers projecting 1.6 units, cheek walls as filled polygons so the steps behind are hidden |
| Round arches and deep balconies with planters | True arcs projected point by point; foliage as clustered short arcs inside an ellipse, on balconies and in planter boxes |

Not drawn: the wash-like tone of the villa sketch (it is fill, not line), the
hand-wobble of the ink strokes, and the palm fronds, which at one pixel become
noise.

## City-block skyline

Three references were read: a dense frontal skyline of towers of many styles,
a one-point view down an avenue, and a three-point view looking up between
towers. What they share is that towers are stacks of setback tiers with a
crown, and that dense horizontal floor lines are what read as glazing. The
generator lays lots on a grid (or on both sides of an avenue for one-point),
builds each tower from one to three tiers, picks a crown (spire, dome, mast,
columned cap, or flat), draws only camera-facing faces with page-colour fills
far to near, and puts a line at every floor and mullions on glass. The Wave
Function Collapse solver stays in the library but no longer draws.
