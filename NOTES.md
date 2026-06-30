# Teaching Notes

Working notes + learner preferences. Refer back before designing each lesson.

## Preferences
- **Fastest path to a postable win** each session; momentum > completeness. One sitting (~1 hr) max.
- **Daily public output is a core goal**, not a nice-to-have. Every lesson must end with a postable
  artifact + a ready-to-paste caption (normal itch.io post + RedNote/小红书).
- **itch.io posts are normal account posts, not project devlogs.** They should still read like visual
  progress logs, not lesson transcripts. Use `reference/itch-devlog-block-kit.md` as the reusable
  block kit for richer lesson posts.
- **Total beginner** — assume zero 3D/Blockbench jargon. Define every term on first use; lean on the
  interface cheat sheet in `./reference/`.

## Confirmed with the learner
- **RedNote (小红书) captions → Chinese only** (confirmed 2026-06-24). Don't also offer an English
  alt-caption for RedNote. The **itch.io post stays English** (Western marketplace) unless the
  learner says otherwise.
- **Pivot/origin is already familiar** (confirmed 2026-06-29). Don't spend a daily lesson on basic
  pivot/origin control unless it is only a small supporting move inside a larger new skill.
- **Exporting is already familiar** (confirmed 2026-06-29). Don't spend a daily lesson on basic
  `.glb`, `.obj`, or game-ready export unless it is only a supporting step inside a larger new skill.
- **Each lesson should introduce a new skill** (confirmed 2026-06-29). Avoid lessons whose main move
  is repeating yesterday's technique on a different prop.
- **Each lesson should include a settings tutorial section** (confirmed 2026-06-29). Keep it scoped to
  the day's tool: where the setting lives, the beginner-safe value, what changes on screen, and when
  to change it.
- **Day 7 redesign direction: beginner UV mapping** (confirmed 2026-06-29). The learner is new to UV
  mapping and is open to a lesson focused on moving/resizing face UVs instead of drawing more texture
  details on the chopping board and knife.
- **Day 7 should build a new, more substantial prop** (confirmed 2026-06-29). Prefer a richer kitchen
  asset over a tiny single-purpose sign, while still keeping the lesson achievable in one focused hour.

## To confirm with the learner
- **OS** for the eventual desktop install (using the browser app for now to remove friction).
- Whether they want to also post to a Western platform (Bluesky/Twitter) — the itch guide says
  off-itch promotion is what actually drives views.

## Rough roadmap (revise freely — this is a compass, not a contract)
- **Week 1 — Foundations & first props:** interface, Generic Model, cubes, move/resize, simple
  color. Output: a few simple kitchen props (crate, chopping board, pot, plate).
- **Week 2 — Texturing & polish:** UV basics, pixel-art textures, one shared palette, nicer
  screenshots/lighting. Output: re-textured props that look like a *set*.
- **Week 3 — A character:** a simple Overcooked-style chef from cubes; proportions; a posed render.
- **Week 4 — Modular pieces & export:** counter/floor tiles that repeat; export to `.glb`/`.obj`;
  game-ready basics.
- **Weeks 5–6 — Pack assembly & ship:** cohesive set, itch.io product page, license, pricing,
  promo shots; publish pack v1.

## Spacing & interleaving (for storage strength)
- Revisit earlier props while learning new tools — e.g. **re-texture the Day-1 crate** during the
  texturing week. Mixing old + new builds long-term retention.
- Open each session with a 30-second recall: "what were the 3 navigation moves?" before new material.

## Lesson log
- **0001** — Your first Blockbench prop (wooden crate). Interface orientation + first cube + color +
  first devlog post. *(authored 2026-06-23; **completed 2026-06-24** — self-reported)*
- **0002** — Second prop: chopping board + knife. New idea: combine multiple cubes into one prop +
  Outliner naming; reuses the color/screenshot/post loop. Caption: itch=EN, RedNote=中文.
  *(authored 2026-06-24; **completed 2026-06-24** — self-reported)*
- **0003** — Cooking pot (body + overhanging rim + two handles). New idea: **Duplicate** an element
  (right-click / Edit menu) for free symmetry — taught via menu, not an asserted hotkey (wiki doesn't
  list one). Interleaves Outliner naming + Space-toggle recall; first 3-piece "set" shot. Framed as
  the seed of modular tiles (Wk4) + chef arms (Wk3). *(authored 2026-06-25; **completed
  2026-06-25** — self-reported)*
- **0004** — Plate and spoon. New idea: **Rotate** via typed Element → Rotation numbers, especially
  <code>Y -35</code> for a utensil lying diagonally on a tabletop. Reuses Duplicate for plate rims,
  reinforces naming and set shots, and adds `reference/blockbench-transform-cheatsheet.html`.
  *(authored 2026-06-25; **completed 2026-06-26** — evidence in repo, "finish plate spoon" commit)*
- **0005** — Shared palette (Week 2 kickoff). New idea: a **limited, saved palette** — build a 6-color
  Overcooked palette via Color Bar HEX + **Add To Palette**, **Export** it, then recolor all four props
  with **Paint Bucket / Fill Mode = Cube**. No new modeling; pure cohesion + polish. Interleaves all
  four old props; win is a before/after "set" shot. Adds `reference/overcooked-palette.html` (canonical
  palette — adhere to it in every future prop) + reusable `.palette/.swatch` CSS. Learner chose this
  over a 5th prop / jumping to painted textures. Sets up Lesson 6 = first pixel texture on the crate.
  Added explicit itch.io devlog finish checklist using official itch.io devlog/search guidance.
  *(authored 2026-06-26; **completed 2026-06-27** — completion requested; post URL not yet captured)*
- **0006** — First pixel texture on the crate. New idea: texture detail is painted pixels, not extra
  cubes. Reopens Day-1 crate, keeps Lesson-5 shared palette, uses Paint Brush size 1 + Painting Grid
  + Shift-straight lines to add plank seams, darker corners, and tiny wood marks. Win is a before/after
  crate render and Day-6 devlog. The original follow-up was another texture-detail pass, but the
  learner wants each lesson to introduce a new skill instead. *(authored 2026-06-27; **completed 2026-06-28** — completion requested;
  normal itch.io draft prepared at `https://itch.io/blog/1566677/day-6-first-pixel-texture-on-the-crate`,
  publication pending approval)*
- **0007** — Chalkboard menu stand: first UV mapping. New idea: UV mapping chooses which part of a
  texture image appears on a selected face. Builds a new, richer kitchen prop with a wooden frame,
  legs, and a chalkboard front, then maps a small `MENU` patch onto the front face. Avoids repeating
  Day-6 texture painting; pivot/origin and basic export are skipped because the learner already knows
  them. *(redesigned 2026-06-29; **completed 2026-06-29** — completion requested; normal itch.io
  visual-devlog draft prepared at
  `https://itch.io/blog/1568012/day-7-first-uv-mapping-on-a-chalkboard-menu-stand`, publication
  pending approval; artifacts in `artifacts/chalkboard/`)*
- **0008** — Bread basket: inflate and deflate. New idea: Inflate scales a selected cube outward
  equally on all axes while keeping UVs intact; Deflate uses a negative value. Builds a new food prop
  with a wooden basket, cloth liner, and three chunky bread rolls. Uses tiny Inflate/Deflate values
  both for shape polish and z-fighting fixes. *(authored 2026-06-29; completion not yet reported)*
- **0009** — Prep counter: Knife Tool. New idea: Knife can split one selected cube into separate cube
  elements, which can then be renamed, colored, lifted, and painted independently. Uses the beginner
  cube-split path only; mesh-face Knife cutting is explicitly deferred. Adds
  `reference/blockbench-knife-tool-cheatsheet.html` and a simple prep-counter target image. *(authored
  2026-06-30; completion not yet reported)*
- **0010** — Sauce bottle: Seam Tool. New idea: seams are mesh-edge instructions for generated UV
  templates, not painted marks. Builds a small sauce bottle using Add Mesh → Cylinder, marks one
  hidden back edge as Divide, generates a texture template, then paints a front label. Adds
  `reference/blockbench-seam-tool-cheatsheet.html` and `assets/images/sauce-bottle-seam-tool-reference.svg`.
  *(authored 2026-06-30; completion not yet reported)*
- **0011** — Tomato trio: Selection Mode, especially Cluster. New idea: Selection Mode changes what
  viewport clicks select inside meshes; Cluster selects the connected face island reached from the
  clicked face. Builds three mesh tomato spheres, merges them into one mesh, then uses Cluster to
  nudge one tomato without selecting faces one by one. Adds
  `reference/blockbench-selection-mode-cheatsheet.html` and
  `assets/images/tomato-trio-cluster-reference.svg`. *(authored 2026-06-30; completion not yet
  reported)*
