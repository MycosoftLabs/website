# Handoff validation — 2026-09-08

The relocated, byte-preserved v1.2 application was tested from `itdx/local` in the Linux build workspace. These are new packaging checks; the historical sample outputs retain their original dates and release identities.

| Check | Observed result |
|---|---|
| Python self-test, including algorithms, import, evidence, launchers, persistence and workbench HTTP | 81 passed in 8.714 seconds |
| Existing JavaScript view tests | 34 passed |
| Workbench JavaScript view/event tests | 8 passed |
| Borda example CLI recomputation | Exit 0; stored result and digest match |
| Source-matrix example CLI recomputation | Exit 0; stored result and digest match |
| Original documents | 30 originals compared to the supplied index hashes |
| Current release | 188 files extracted without changes; exact ZIP hash is recorded in the manifest |
| Package hygiene scan | No matches for scanned private-key/token patterns or private runtime paths in the scanned files/archive members |

`handoff_checks.json` records the commands and scope. `../verify_handoff.py` checks every manifested file and compares the full local snapshot to the original ZIP. Git attributes preserve the archived bytes across line-ending settings. The receiving TypeScript compiler and website Docker context exclude `itdx/`; the next production implementation belongs in normal service/application paths.

No new live-service execution, browser layout rehearsal, Windows/macOS run, full website build, production deployment or official Army acceptance was performed. The existing 205-trial stress results are retained historical synthetic evidence and were not relabeled as a fresh run.

The manifest establishes consistency relative to its recorded hashes, not an external trust anchor. Verify the receiving Git commit through the established repository review process. No runtime database, private signing key or local credentials are part of the committed handoff.

Git staging was checked: all 212 handoff files matched their intended bytes, including all 188 frozen release files and 30 originals. The two root edits only exclude the archive folder from TypeScript compilation and the Docker context. Whitespace validation passes for new handoff files and root edits; a whole-patch check reports formatting already present in the preserved release/documents/artifacts, which were deliberately not rewritten.
