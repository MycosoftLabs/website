# Earth Simulator First-Paint Fix — Cloud Session Handoff — June 12, 2026

## Read This First: Repo State vs. The Old Handoff

This session continued from `EARTH_SIMULATOR_PRODUCTION_MAP_FIX_HANDOFF_JUN12_2026.md` (that file lives only on the
local Windows machine at `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\`; it was never
committed). The critical discovery of this session:

**Codex's local working-tree changes were never committed or pushed.** The committed repo does NOT contain:

- `earthSimDeferredDataReady` (the 35–55s first-paint gate the old handoff calls the "highest priority root cause") —
  does not exist anywhere in committed code.
- `extractMindexSpeciesRows` / `normalizeSpeciesRowToFungalObservation` helpers — do not exist.
- The Intel Feed `z-[90]`/`z-[95]` z-index changes — not in committed code.
- The device seed status flip to `offline` — not in committed code (and good riddance; see below).
- The old handoff's line numbers — all stale; they describe the dirty local tree.

The