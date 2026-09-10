# Earth Sim Live Data Bind Complete — September 10, 2026

**Date:** September 10, 2026  
**Status:** Complete on 3010. Not a 187 cutover.  
**Related:** `docs/EARTH_SIM_ENV_AND_LIVE_DATA_LAYER_TEST_SEP10_2026.md`  
**RJ Ricasata = CFO.** No mock data. `/fusarium/itdx` was not edited.

## Outcome

Every catalog Arraylake Live Data layer is bound on the NatureOS / Fusarium Earth Sim globe. ON draws that overlay; OFF removes only that prefix. Empty bake stays honest empty.

ITDX Instant Deploy owner: include the worktree files listed in the test doc in the same SHA. Do not start docker/187 from this bind lane.

## Verify

1. `http://localhost:3010/natureos/earth-simulator`
2. Live Data chips under Environmental Conditions
3. Toggle one baked field — green chip, `crep-field-{dataset}-{variable}-src-0` or `canvas.crep-wind-*`
4. `node scripts/_earth_sim_all_livedata_proof.mjs`
