# Artifacts and replay boundaries

| File | Use |
|---|---|
| [Mycosoft_ITDX26_Local_Application_v1.2.0.zip](Mycosoft_ITDX26_Local_Application_v1.2.0.zip) | Current downloadable release; `../local/` has the same file bytes |
| [Mycosoft_ITDX26_Local_Application_v1.1.0.zip](Mycosoft_ITDX26_Local_Application_v1.1.0.zip) | Historical source for exports tied to the v1.1 code snapshot |
| [Mycosoft_ITDX26_Local_Application_v1.0.0.zip](Mycosoft_ITDX26_Local_Application_v1.0.0.zip) | Original historical release; retain its distinct fixture definitions |
| [NLM_Frame_and_Packet_Explorer.html](NLM_Frame_and_Packet_Explorer.html) | Standalone explorer of a recorded synthetic run, measurements, fusion, priors, frame proofs, and software transmission envelopes |
| [ITDX_Capability_Audit_2026-09-08.html](ITDX_Capability_Audit_2026-09-08.html) | Dated capability review and gaps; findings are not a continuous production monitor |

Download HTML files and open them in a regular browser. GitHub's source viewer does not execute them. The frame explorer contains 960 synthetic observations, with a selected 320-record evaluation capture and 100 software transport envelopes. It is not a live sensor session or a qualified physical radio demonstration.

The sample results under `../local/sample_results/` preserve their original dates, versions, hardware, and provenance. Most main-task measurements were recorded for v1.1; the separate workbench validation records v1.2 additions. Do not relabel the old runs as fresh v1.2 measurements. When exact replay rejects a source mismatch, use the matching archived release; do not turn off the source check.

SHA-256 of the current ZIP:

```text
016a3444e1a5d9e58751b6469e1b13c778c641fe8f88d7e1138d2c25fac62250
```

Bundled documents and vendored code retain their existing notices. This handoff grants no new license or third-party data rights. Personal operator databases, credentials, and private signing keys are not included.
