# ITDX — local v1.2 and live integration handoff

**Start with [CURSOR_HANDOFF.md](CURSOR_HANDOFF.md).** This folder contains the complete local application, source documents, measured example outputs, and the implementation specification for integrating the next version into Mycosoft's live systems.

The current executable release is **1.2.0**. The proposed next release is **1.3.0**, subject to the receiving repositories' version conventions. This handoff does not deploy a new website route, connect production services, supply military feeds, or establish official ITDX acceptance.

| Open | Purpose |
|---|---|
| [CURSOR_HANDOFF.md](CURSOR_HANDOFF.md) | Detailed work order, implementation sequence, ownership, and completion criteria |
| [integration/ITDX_16_OBJECTIVES.md](integration/ITDX_16_OBJECTIVES.md) | All 16 presentation objectives, exact current coverage, missing task workflows, and registry requirements |
| [integration/SERVICE_CONTRACTS.md](integration/SERVICE_CONTRACTS.md) | Existing endpoint findings, proposed API contracts, persistence, and failure behavior |
| [integration/NLM_FRAME_SPEC.md](integration/NLM_FRAME_SPEC.md) | Sensor-to-frame data, mathematical Form Space, fusion, priors, and transmission |
| [integration/ACCEPTANCE.md](integration/ACCEPTANCE.md) | Executable acceptance plan, four task products, scenarios, and rollout gates |
| [integration/LOCAL_SETUP.md](integration/LOCAL_SETUP.md) | Home computer setup and deployment distinctions |
| [DOCUMENT_INDEX.md](DOCUMENT_INDEX.md) | Original names and hashes for all 30 bundled documents |
| [local/README.md](local/README.md) | Existing application instructions and limitations |
| [artifacts/README.md](artifacts/README.md) | Downloads, historical replay, frame explorer, and capability audit |
| [MANIFEST.json](MANIFEST.json) | Byte-level inventory of this handoff |
| [validation/HANDOFF_VALIDATION.md](validation/HANDOFF_VALIDATION.md) | Checks actually performed during packaging |

## Run v1.2 now

From the website checkout:

```sh
cd itdx/local
python launch.py
```

Use `python3` on systems where that is the Python 3 command. Python 3.10+ is required. Windows users can run `START_HERE_WINDOWS.bat`; Mac users can run `bash START_HERE_MAC.command`; Linux users can run `bash START_HERE_LINUX.sh`. Keep the launcher terminal open and use the address it verifies and opens. A service on another computer or in a remote workspace is not your home computer's localhost.

To check the handoff before running it:

```sh
python itdx/verify_handoff.py
```

`local/` is a byte-preserved extraction of the v1.2 release. It remains separate from Next.js compilation and the website Docker context. User data and signing keys are created locally and are excluded from Git. Do not overwrite the only copy of an existing `local_data/` directory.

## What is implemented

The organizer presentation lists 16 objectives, supplied by the owner in this conversation. Tasks 12, 13, 8, and 14 run as local prototypes with native Mycosoft modules and disclosed reference algorithms. Task 10 has partial source-review support; the other 11 task workflows are not implemented. The application includes 41 internal preparation cases, reproducible synthetic stress results, evidence exports, source-report review with a 36-cell ASCOPE/PMESII matrix, and Borda preference aggregation. Real imported measurements can be computed; imported files are not automatically authenticated field evidence.

The local SQLite store is not production MINDEX. Seven deterministic reviewer roles are not live multi-model MYCA orchestration. The native 16D encoder plus a 25-parameter temporal readout is not a trained SSM/GNN stack. The offline map is not the full Earth Simulator. Optional service probes do not change these facts.

## Cursor's first instruction

Read `itdx/CURSOR_HANDOFF.md` and its linked specifications, inventory the actual current services and repository instructions, preserve the frozen v1.2 snapshot, and implement the milestone sequence on separate integration branches. Prove each live dependency with a real request, persisted input/output identities, and end-to-end tests. Preserve explicit synthetic, recorded, imported, and live labels throughout the UI and exports.
