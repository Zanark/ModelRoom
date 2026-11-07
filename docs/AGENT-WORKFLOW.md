# The human + agent modeling loop

## 1. Turn the prompt into an observable contract

The human describes a subject and supplies references to their coding agent.
The optional site's brief export carries prompt text and reference filenames;
the original reference images must accompany it separately.

Record silhouette, intended style, dimensions, origin, up/front axes, material
roles, movable parts and export expectations. Distinguish user-supplied references
from reusable licensed source, and visual targets from measured dimensions.
Do not invent precision from a photo or claim approval from passing tests.

This is agent collaboration through project files, **not** a browser chat API,
background daemon or unrestricted execution bridge. No credentials in the page.

## 2. Author the object, not the room

Implement a self-contained factory under `src/models`. Use the same stack:
Three.js0.186.1, Canvas2D and ES modules. Start with the broad silhouette, then
cross-sections and thickness, then articulation, surface detail and labels.
Use primitive meshes for simple volumes, extruded outlines for manufactured
profiles, lathe geometry for rotational objects, custom indexed buffers for
parametric surfaces. Choose based on visible/picking requirements, not polygon
count. Small color-only text can be a decal; true recesses need topology.

The existing box factory returns:

```js
{ root, parts, setOpen, getRecipe }
```

`root` is only the portable object. `parts` are inspectable meshes/groups.
The box-specific `setOpen` is not a universal model API. New subjects should
expose their own documented parameter controls rather than pretend to be boxes.
Use `viewer.setModel(root, parts)` to install a new asset and `renderParts`
plus inspector bindings in `src/main.js` to expose its actual properties.
Add an honest shelf entry and metadata, not a generic prompt-keyword switch.

The initial app has one integrated subject with three color studies; it is not
yet a plugin loader or multi-agent job queue. Extending the catalogue requires
source changes by the agent, followed by reload/HMR and verification.

## 3. Preserve a clear hierarchy

One unit is one meter; Y up, front +Z. The box rests on Y=0, centered in X/Z.
Each movable flap owns a pivot positioned at its physical crease. Child
geometry is offset away from that pivot. Articulation changes parent rotation,
not the vertices of unrelated parts. Positive scale preserves handedness.

Document default and extreme poses. Test finite vertices/normals, nonzero
bounds, part inventory, floor relation and complete articulated envelopes.
Bevels and decorative protrusions count in bounds; use measured geometry.

## 4. Design for interchange before tuning a beauty render

Prefer `MeshStandardMaterial`, ordinary UVs, standard colors/roughness and
image-backed textures. Mark color images sRGB; non-color roughness/normal data
must remain non-color. A custom shader that looks good in WebGL does not
magically travel to Blender. Bake portable outputs or disclose the limitation.

Share materials/geometries intentionally. Each replaced root's disposal
enumerates unique resources and releases GPU data; do not leak on each edit.
Keep studio lighting and meshes outside the export root. Export a cloned
hierarchy so asynchronous serialization does not reparent the live object.

## 5. Inspect in layers

Check front/back/left/right/top/bottom/three-quarter, including movement extremes.
Use neutral lighting first, then golden/cool presets and moving lights. Diagnose
normals, face orientation and spatial relationships before increasing exposure.
Switch wireframe to distinguish silhouette geometry from texture detail.

Full camera orbit is not a physics simulation. Fitting the entire object is not
proof that all parts are visible. Select meaningful surfaces and check actual
nearest-hit picking. Avoid colliding invisible interaction proxies.

## 6. Verify and hand off

Run syntax/docs checks, model tests, production build and focused browser cases.
Exercise actual controls and download the real GLB; parse and reimport it,
compare bounds/mesh counts/materials/images, and run a standards validator.
If Blender is installed, use its real importer and inspect object/material/
image results; otherwise disclose the missing environmental qualification.

Record actual failures, corrective changes and review scope in the workstream/
ledger. Keep the README visual and short; put deep explanations in linked docs.
Update only this base's private context and refresh Context Mesh. Do not
automatically commit, push or publicly deploy.

## Reusable brief

```text
Subject:
Style and silhouette:
Physical dimensions / what is estimated:
References and allowed use:
Separate parts and moving pivots:
Materials and visible detail:
Important viewing angles:
Export target: self-contained glTF2 GLB for Blender
Acceptance: geometry, visual inspection, interaction and export checks
```
