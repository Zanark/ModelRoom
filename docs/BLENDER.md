# Model Room to Blender

1. In Model Room, finish the shape, color and flap pose.
2. Click **Download model**. Save the `.glb` file.
3. In Blender, choose **File > Import > glTF 2.0 (.glb/.gltf)**.
4. Choose the downloaded file. Select the imported hierarchy and use Frame
   Selected (numpad decimal) if necessary.
5. Switch to **Material Preview** for paper color and the label. Save your own
   `.blend` after editing.

Blender's glTF importer is normally enabled by default. See the
[official Blender 4.5 manual](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html)
if the import entry is absent.

## What survives

Real triangulated meshes, named object hierarchy, panel thickness, current flap
transforms, metallic/roughness PBR material parameters, UVs and embedded paper/
label images. Coordinates use glTF's meter convention with Y up; Blender's
importer converts axes. A default body is 0.32 x 0.24 x 0.26 meters before
including open flaps. Check scale before using it as a manufacturing reference.

## What is deliberately absent

Viewer camera, grid, selection outline, floor, lights, environment and UI.
The room's lighting and Blender's color management are different; do not expect
pixel-identical rendering. GLB transports assets, not a rendered lighting result.

JavaScript construction functions do **not** become Blender Geometry Nodes,
modifiers, parametric CAD history or constraints. The meshes are editable, but
regenerating them from the recipe happens in Model Room's source.
The box's hinges are real parent transforms, not animated/rigged Blender controls.
Imported animations are not played or included in this starter's re-export.
This isn't a watertight manufacturing mesh or CAD/3D-print certification.

## Other downloads

- `.recipe.json`: box construction parameters, not a Blender-importable asset.
- `.png`: rendered viewport image, not editable geometry.
- `model-room-brief.json`: prompt/reference metadata for an agent, not a model.

## Qualification

See [VERIFICATION.md](VERIFICATION.md) for what was actually executed in this
workspace. The file format's documented Blender support is not, by itself,
evidence that a native Blender import was executed here.
