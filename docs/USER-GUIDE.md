# Your first room

## Inspect the starter model

Open the loopback address printed by `npm run dev`. The center is a real WebGL
viewport. Drag to orbit; right-drag to pan; scroll to zoom. On touchscreens one
finger orbits and two fingers pan/pinch. Focus the viewport with Tab or click
its region, then use arrow keys, `+`/`-`, or `F` to fit.

The small T/F/R/B/L/U/3D controls select top/front/right/back/left/underside/
three-quarter views. They are **perspective** views, not orthographic engineering
drawings. Fit measures the entire articulated model, not just its closed body.
Bottom view turns off ground and grid so they cannot obscure the underside.

The toolbar toggles automatic camera orbit, reference grid and wireframe.
Automatic rotation is off at startup, including for reduced-motion users.
Capture saves the actual viewport as a PNG, not a vector or 3D file.

## Refine the box

The shelf contains kraft, lilac and ink studies of the same original model.
Switching studies resets its dimensions and color. The flap slider articulates
four separate panels around their own named pivots. Dimensions control the
closed body's outer width/height/depth, in millimeters, from 100 to 600.
The displayed bounds include unfolded flaps, so they can be larger.

Color changes the paper material; the label retains its own cream stock.
Reset restores the current study. The studio, golden and cool presets, light
direction, ground, grid and interface theme belong to the viewer, not export.
Click a visible surface or open Explore the parts and choose a named part.
The purple box is an inspection helper. Clear removes the selection.

## Bring an idea

Describe the subject, style, physical dimensions and movable parts in the brief.
Add up to six PNG/JPEG/WebP references, at most 10 MB each. They are browser-local
previews; removing one releases its object URL. **Save brief** downloads JSON:
your prompt, image metadata and current recipe. The original image bytes are
not included. Give the brief and original images to your coding agent.

Nothing is submitted to an AI or uploaded to a server. Reloading clears briefs,
references, imported files and edits. Download anything you want to retain.
The site does not watch your filesystem, send prompts to another session or
run arbitrary code pasted into a form.

## Open a model

Open a local `.glb` to inspect another self-contained, uncompressed glTF2 object.
The limit is 50 MB. Models requiring extensions/compression or external textures/
buffers are rejected explicitly. An import error leaves the previous model
usable; choosing a starter study returns to the procedural box.

Imported models show their mesh parts. Box-specific controls and recipe export
are disabled. This first version inspects/re-exports a **static pose**, not
imported animation clips, Blender constraints or simulations.

## Take it into Blender

Use Download model, not Save construction recipe. See [the Blender guide](BLENDER.md).
The GLB preserves the current box pose, paper color, separate parts, embedded
textures and original authoring transforms. It doesn't include the room.

## Troubleshooting

- Graphics unavailable: use a current WebGL2-capable browser with graphics
  acceleration. A WebGL context loss is surfaced; reload to restore it.
- Port busy: choose another explicit loopback port or stop only your own server.
  The command does not silently take over another service.
- A model is black in Blender: switch to Material Preview or provide your own
  lights. Model Room intentionally does not export its studio.
- Underneath is hidden: use bottom view or disable ground and grid.
- Invalid dimension: enter 100-600 mm. Rejected edits restore the existing value.
- Imported model unsupported: export a plain, self-contained GLB without
  compression/required extensions first. Do not upload sensitive assets elsewhere
  to convert them unless you explicitly intend that disclosure.
