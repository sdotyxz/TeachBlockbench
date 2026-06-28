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
  crate render and Day-6 devlog. Sets up next likely lesson = apply the same texture-detail pattern to
  the chopping board and knife. *(authored 2026-06-27; **completed 2026-06-28** — completion requested;
  normal itch.io draft prepared at `https://itch.io/blog/1566677/day-6-first-pixel-texture-on-the-crate`,
  publication pending approval)*
- **0007** — Texture pass on the chopping board and knife. New idea: different materials need
  different pixel marks. Reopens the Day-2 board, keeps the shared palette, adds short broken wood
  grain to the board, a crisp steel highlight to the blade, and a few dark handle pixels. No new
  geometry; the win is a cleaner board-and-knife render and Day-7 devlog. Sets up next likely lesson =
  apply controlled texture detail to the cooking pot. *(authored 2026-06-28; completion not yet
  reported)*
