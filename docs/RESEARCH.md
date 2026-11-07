# Modeling research and adopted decisions

Research performed 2026-11-08 for this implementation. The older BowserBoy
handbook is prior project evidence, not newly authored history or a claim that
every one of its 328 pages was re-reviewed for this task.

## Prior work actually reviewed

Read the handbook entry, standalone agent handoff and relevant chapters:
01toolchain,04geometry,17camera/inspection,29color/light and33lifecycle.
The handbook pins its implementation to BowserBoy commit
`1e4ef518d6943ab1af39cef3b4d558f209a17891`. Its model factories construct
geometry, rather than importing a completed Blender/GLTF asset.

Transferred techniques: named factories and parts, explicit coordinate frames,
real thickness/recesses where silhouette requires them, local pivot ownership,
complete articulated bounds, separate color/emission/light/exposure diagnosis,
layered tests and explicit resource disposal. Did not copy its models/assets,
scene-scale assumptions, emulator behavior, private media or unusual exposure.

Method reference:
[original public handbook](https://github.com/Zanark/BowserBoy/tree/c61346594396c115a0eec29d656866a0c57ece57/docs/modeling-book).

## Primary research receipts

| Source actually read | Supported decision | Limit |
|---|---|---|
| [Three GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html) | `parseAsync`, binary GLB, TRS and embedded-image texture size budget | Current docs checked against installed0.186.1 during implementation; not CAD/modifier export |
| [Blender4.5 glTF manual](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html) | Blender import menu, editable meshes/hierarchy and metallic/roughness PBR/material-node mapping | Official format capability is not execution of Blender on this machine |
| [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) | Camera orbit/pan/dolly, damping updates, touch and time-based auto-rotation | Does not author geometry or simulate object physics |
| [RoundedBoxGeometry](https://threejs.org/docs/pages/RoundedBoxGeometry.html) | Beveled solids with explicitly bounded radius and segmentation | Rounded cards are a visual model, not corrugation/contact analysis |
| [Color management](https://threejs.org/manual/pages/color-management.html) | sRGB image inputs/output, linear lighting, no double-conversion | Does not make Blender's view transform pixel-identical |
| [Cleanup](https://threejs.org/manual/pages/cleanup.html) | Explicit resource disposal, shared-resource enumeration | JS garbage collection alone does not release WebGL allocations |
| [Render on demand](https://threejs.org/manual/pages/rendering-on-demand.html) | Dirty scheduling, damping update/request separation, idle power budget | Needs ongoing frames when actual animation is enabled |

Two guessed latest Blender URLs and the older `/manual/en/` Three color URL
returned404. Those failures did not supply evidence. Followed source discovery
to the working versioned Blender and current Three manual URLs above.

## Modeling decisions and deeper reasoning

### Representation follows the question

For a cardboard box, the key observations are hollow interior, panel thickness,
folded/unfolded silhouette, closed layering and separable parts in Blender.
A solid cube with a dark top texture cannot satisfy those observations.
Nine primary solids and four crease parents can. Subdivision sculpting or
implicit remeshing would add complexity without improving these requirements.

For organic future models, use a smooth parametric surface or lathe where
appropriate. Preserve intentional normals and indexed adjacency rather than
turning every surface into disconnected flat triangles. Geometry/UV
discontinuities increase exported vertex count; triangle count is not a full
measure of visual quality or memory cost.

### Hinge space is a data model

A panel's geometry is displaced from its crease parent, not centered at its
rotation origin. Moving that parent through an angle preserves attachment.
Keeping the object root fixed separates authoring transforms from inspection
camera motion and prevents world lighting from rotating with mouse input.
Current-pose GLB includes those local TRS relationships; it does not invent a
Blender rig or procedural animation system.

### Design the portable subset early

glTF is an asset transmission format, not a source-editor archive. Ordinary
standard materials, explicit UVs and embedded PNG textures are much more
portable than `onBeforeCompile`, renderer-specific shader uniforms or DOM
textures. Real geometry remains editable after import; construction logic
belongs in this repository and its JSON parameter recipe.

A binary file avoids fragile neighboring texture paths. This first version
rejects external image/buffer URIs on import and unsupported required
extensions, rather than quietly fetching content or dropping features.
Export/import checks must ensure our own output fits that supported subset.

### Separate material from the viewing instrument

A neutral environment and measured camera envelope expose construction.
They must not be baked into the object or used to disguise broken topology.
Explicit color-space tagging prevents treating color as linear data twice.
The studio light rig rotates independently so the human can inspect grazing
highlights and thickness without rebuilding anything.

### Quality means several different tests

Finite geometry and stable part dimensions are deterministic model checks.
Real UI manipulation verifies event binding and resource lifecycle.
A downloaded GLB roundtrip checks the file actually delivered to the human,
not just a serializer return type. Standards validation checks asset structure.
A native Blender importer is a separate environmental qualification.
Finally, human aesthetic approval is not implied by any of those results.

### A coworking space need not expose an execution server

The agent can already write source in this repository. A static viewer plus
brief/feedback loop accomplishes the requested initial workflow without
putting a broad filesystem/execution bridge or API credential in a webpage.
Future API-powered creation would be a separate architecture with explicit
authentication, data-handling, authorization and failure contracts.

## Deferred, not secretly implemented

Multiple agents/job queues, AI inference inside the website, collaborative
network state, arbitrary model generation, sculpt/paint tools, animation
editing, CAD/boolean assembly, rigging, texture uploads and public hosting.
No benchmark, physical measurement or user aesthetic approval was performed
merely by reading these references. Actual executed checks live in
[VERIFICATION.md](VERIFICATION.md).
