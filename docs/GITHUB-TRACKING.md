# Workstream tracking

One numbered finite workstream maps to one actual repository issue and one
issue-containing Project item. Local `.todo` files own the managed description
and lifecycle; remote human edits must be reconciled before replacement.
Index00 and perpetual ledger02 are excluded. All eight required fields remain.

## This repository's adoption

- Repository: public `Zanark/ModelRoom`; mirror only public-safe workstream text.
- TODO directory: `TODO`; finite workstream01, index00/ledger02excluded.
- Actual issue: [#1](https://github.com/Zanark/ModelRoom/issues/1).
- Dedicated owner Project: [Model Room /11](https://github.com/users/Zanark/projects/11),
  actually linked to the repository.
- Exact discovered issue/item/field/option IDs: `TODO/.github-tracking.json`.
- Status mapping: `NOT_STARTED` -> open / `Todo`; `IN_PROGRESS` -> open /
  `In Progress`; `DONE` -> closed/completed / `Done`. Any other vocabulary
  requires explicit mapping, not substring inference.
- Local TODOs own managed descriptions/lifecycle. Human body text outside the
  managed section and all issue comments are preserved.
- Trigger: explicit documented manual updates during work; no scheduler,
  Actions workflow or automatic/two-way sync daemon.
- Backlinks are local source changes; they are not automatically committed.
- Retained last verified remote lifecycle/status/managed-content digest:
  `TODO/github-sync-state.json` after successful readback.

Creation inventory was actually read before writing: repository had zero
issues and no linked Project, and the owner's existing Projects had no Model
Room board. `gh project list` returned `unknown owner type`; exact GraphQL
owner/project discovery worked. No project/issue was duplicated to work around
that CLI path. The stable identity marker is `modelroom:workstream:modelroom-01`.

Use the reviewed shared credential runner from the development-documentation
manual when applying authorized GitHub operations; never read its credential
file, print environment variables or persist a token in this project.
No scheduler/background synchronizer or two-way writer is installed.

Before any later update: read the actual issue and Project item, verify stable
identity/managed content against local retained tracking state, preserve human
content outside managed markers, update only the intended workstream, then
independently read back issue body/lifecycle/item/status and local backlink.
If a write is uncertain, discover the existing object before creating anything.
Do not convert failed reads into an empty remote inventory.

## Guarded manual update

1. Read the actual issue body/state and Project membership/status using the
   exact mapping IDs. Normalize only line endings before hashing.
2. Verify exactly one identity marker and managed start/end pair. Compare the
   current managed-content SHA256 to the last verified digest. Unexpected edits
   inside it are a conflict; stop rather than overwrite.
3. Generate the managed section from the local workstream, excluding the
   issue/Project backlink lines (which are metadata). Keep outside text exactly.
   The initial outside notice says source is local; remove/change that only
   after a separately authorized verified publication.
4. Apply issue body from a reviewed local file, close/reopen with the correct
   completion reason, then set the actual Project Status using its exact option.
   Partial failure is pending work, not permission to create another issue.
5. Independently fetch again; compare managed content to the local projection,
   issue state/reason and Project item/status. Only then record the new digest/
   lifecycle/status/timestamp in the retained receipt.

This is a concrete one-workstream adoption, not a generic sync engine.
Future workstreams must be deliberately added with their own stable identity,
actual issue/backlink/Project item and receipt.
