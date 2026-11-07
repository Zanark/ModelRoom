# Verification record

Executed 2026-11-08 on Windows, Node26.13.0, Three.js0.186.1,
Playwright1.64.1 and installed Microsoft Edge. These are local results,
not fresh-machine reproduction or user aesthetic approval.

## Required gates

- `npm run check`: passed source syntax, documentation links and TODO schema.
- `npm test`: **6 passed**, no skips. Invalid recipe boundaries, finite
  positions/normals, actual panel thickness/scale, stationary crease positions,
  extreme articulated bounds, malformed/external GLB rejection and deduplicated
  resource cleanup.
- `npm run build`: passed. Relative production assets load and render under
  `/preview/model-room/`, with no failed responses or browser page errors.
- `npm run test:browser`: **7 passed**, no skips. Real surface selection, part
  list, pointer orbit/pan/wheel zoom, keyboard orbit, all preset directions,
  underside access, flap/dimension/color changes, study switching, lighting,
  theme, explicit failures, downloads and a 390x844 phone viewport.
- Downloaded GLB: Khronos `gltf-validator` reports **0 errors, 0 warnings**.
  Twelve informational `UNUSED_OBJECT` messages identify extra UV attributes
  on untextured cut-edge strips. These are disclosed, not classified as errors.
  Reimport and a second export also pass. Bounds and all22meshes survive;
  four named crease parents and two embedded material images are present;
  viewer stage/camera/lights/grid are absent.
- Actual recipe/brief JSON content and decoded PNG download checked. Reference
  brief carries metadata, not image bytes. Invalid import preserves old model.
- Runtime requests: no external HTTP dependency in the normal startup check.
- Actual local server responds200 at `http://127.0.0.1:4173/`; it is detached
  intentionally for the user's requested local testing, not public hosting.
- Desktop light/dark and phone screenshots inspected. One readability pass
  enlarged functional text/touch controls rather than sacrificing model area.
- Native Blender import: **not executed**. No Blender executable found through
  PATH/conventional Program Files/user tool locations; Python `bpy` unavailable.
  No new Blender installation was performed. Standards validation and the
  real browser roundtrip qualify the asset format, not a native Blender run.

## Warnings and fixes

The pinned Three release warns that `PCFSoftShadowMap` has been removed.
Changed to supported `PCFShadowMap` and reran all checks. The browser's graphics
compiler still prints X4122 floating-point precision warnings during environment
shader compilation; no page error or observed rendering failure accompanies them.
The production bundle is approximately699kB/178kB gzip; Vite's500kB advisory
remains. This is disclosed startup weight, not a failed build; no threshold
was raised to suppress it.

Invalid-model and invalid-dimension tests intentionally log explicit errors.
Those are exercised rejection paths, not unexpected runtime errors.
Pagehide preserves a page stored in the back-forward cache rather than
destroying its viewer before restoration.

## Evidence locations

- `docs/images/workspace.png`: original live application screenshot for README.
- `.local/workspace-dark.png`, `.local/workspace-mobile.png`: private review.
- `.local/verified-box.glb`, `.local/gltf-validation.json`: real download/receipt.
- `.local/serving-evidence.json`: actual loopback/subpath delivery result.
- `test-results`: test-run outputs; overwritten by subsequent runs.

Reproducible commands are in the root README. Browser evidence is private under
`.local`; public records retain results and limits, not prompts or user images.
Human aesthetic acceptance, CAD/printing suitability and public deployment are
outside these automated gates.
