# Overcooked-style Blockbench Assets — Resources

Curated, high-trust sources. Lesson knowledge is drawn from here, not from memory.
Last reviewed: 2026-06-30.

## Knowledge

- [Blockbench — official site](https://www.blockbench.net/) ·
  [Web app (no install)](https://web.blockbench.net) ·
  [Downloads (Win/Mac/Linux)](https://www.blockbench.net/downloads)
  The tool itself — free and open-source (GPL). Use for: launching the app, getting the desktop build later.
- [Blockbench Wiki](https://www.blockbench.net/wiki/)
  Official documentation. Use for: authoritative answers on tools, formats, UV, export.
  - [Overview & Tips](https://www.blockbench.net/wiki/guides/blockbench-overview-tips/) — interface,
    navigation, panels, tools. Use for: shortcuts and what each panel does — incl. the Paint-mode
    tools (brush, bucket, color picker, Draw Shape, Mirror Painting; Shift = straight line).
  - [Painting & Textures docs](https://documentation.blockbench.net/textures/) — texture resolution,
    painting on the model, brush size/softness. Use for: adding detail by raising texture resolution.
  - [Formats](https://www.blockbench.net/wiki/blockbench/formats/) — which project type to pick and
    what each exports. Use for: confirming Generic Model + export formats when we ship.
- [Blockbench GitHub source — Knife Tool](https://github.com/JannisX11/blockbench/blob/8fe8d9d/js/modeling/mesh/knife_tool.js)
  Official source implementation. Use for: exact Knife Tool behavior, especially the beginner cube
  split path versus the more advanced mesh face cutting path.
- [Blockbench GitHub source — Seam Tool](https://github.com/JannisX11/blockbench/blob/master/js/modeling/mesh/seam_tool.ts) ·
  [Texture template seam logic](https://github.com/JannisX11/blockbench/blob/master/js/texturing/texture_generator.js)
  Official source implementation. Use for: exact Seam Tool behavior: mesh-only Edit-mode tool,
  Auto / Join / Divide modes, and how seams influence generated texture templates.
- [Blockbench GitHub source — Selection Mode](https://github.com/JannisX11/blockbench/blob/master/js/modeling/mesh_editing.js) ·
  [Cluster viewport selection logic](https://github.com/JannisX11/blockbench/blob/master/js/preview/preview.js) ·
  [Merge Meshes source](https://github.com/JannisX11/blockbench/blob/master/js/modeling/mesh/merge_split.ts)
  Official source implementation. Use for: mesh Selection Mode options, especially Cluster selecting
  connected face islands, and the beginner workflow of merging separate meshes before using Cluster.
- [YouTube — "How to Make Low-Poly Models with Pixel Texture" (Blockbench)](https://www.youtube.com/watch?v=GukhptdHlPk)
  Beginner end-to-end: model a low-poly object and give it a pixel texture. Use for: a watch-along
  of the whole first-model loop.
- [YouTube — "Making Low Poly Assets | Blockbench | FULL PROCESS Timelapse"](https://www.youtube.com/watch?v=qD6YPlEUguI)
  Watch a real prop get built start to finish. Use for: proportion + workflow intuition.
- [YouTube — "Low-Poly Character Model in Blockbench | Timelapse & Commentary"](https://www.youtube.com/watch?v=fA8c1heR2-s)
  Chibi-style character build. Use for: later, when we make a chef.
- [YouTube — "Low-Poly Modelling" playlist](https://www.youtube.com/playlist?list=PLxfQIomHccxu7iEawHA82iDFtIA6Phzd3)
  A structured series. Use for: progression beyond the basics.
- [itch.io — "Getting started with 3D assets on itch.io"](https://itch.io/t/5670871/getting-started-with-3d-assets-on-itchio)
  Community guide to packaging and selling. Use for: pack pages, tags, formats, licensing.
- [itch.io — Blockbench + Low-poly assets](https://itch.io/game-assets/tag-blockbench/tag-low-poly) ·
  [Top sellers: 3D + Low-poly](https://itch.io/game-assets/top-sellers/tag-3d/tag-low-poly)
  Market research. Use for: studying what sells, pricing, and how packs are composed/presented.

## Wisdom (Communities)

- [Official Blockbench Discord](https://discord.gg/blockbench)
  The main hub — share WIP, ask questions, get feedback from experienced modelers.
  Use for: "why does my model look wrong?", proportion/texture critique, motivation.
- [itch.io community forums](https://itch.io/community)
  Use for: feedback on your pack page and selling advice once you have something to show.
- RedNote (小红书) — your own daily devlog audience. Use for: building-in-public, accountability,
  and reach to a Chinese gamedev/art audience.

## Gaps
- No single canonical "Overcooked-style pack" tutorial found yet — we'll synthesize from the
  low-poly tutorials above plus studying real Overcooked screenshots. *Future search:* stylized
  kitchen-prop tutorials, Overcooked art breakdowns, palette references.
- Need a verified reference on Blockbench → `.glb`/`.gltf` export settings for game-ready assets
  (pull from the Wiki **Formats** page when we reach exporting).
- Tutorials found span 2022–2024; the live UI may differ slightly. Trust the **Wiki** + the app
  itself over any single video.
