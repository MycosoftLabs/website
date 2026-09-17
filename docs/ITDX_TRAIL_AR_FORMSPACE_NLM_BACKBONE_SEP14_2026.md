# ITDX Trail AR FormSpace NLM Backbone — 14 Sep 2026

Date: 14 September 2026  
Status: Local 3010 terrain demo (no Instant Deploy)  
Sources: five Mycosoft ITDX papers presented to Dr. Hess (commercial working papers; EV-SAO-CUI-DET-001). PDFs were not copied into this repo.

## What is real vs not yet scored

| Metric | Status |
|---|---|
| NLM weights on 188 SHA-256 `0c5fb815bf9b1e75a0e9aa27a3c373eb675d142a93e688b20d3f1084874091b2` | **Real** (matches weights paper + `/api/nlm/runtime`) |
| Parameter count 25,728 / 47 tensors / `bound_to_ollama: false` | **Real** |
| `forecast_p` / `p` | **null** (never stubbed) |
| PXL ADE20K fractions (t=0,2,4,6,8 s) | **Real laptop-lab receipts** (appearance, not species) |
| WEKA fixture 176/240, mIoU ≈ 0.628 | **Authored fixture arithmetic**, not trail accuracy |
| Trail F1 / Brier / confusion | **not yet scored** — `actual=?` until independent labels |
| Task 12/13 synthetic F1 = 1.000 | **Archived synthetic**, not this hike |

## ARFF paths

Feature (inspect attributes; do not train J48 as NLM):  
`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.data\trail-ar\weka\trail-ar-session.arff`

Prediction (runbook §3: `p_background`, `p_candidate`, `actual`; abstention is `?,?,?`):  
`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.data\trail-ar\weka\trail-ar-predictions.arff`

JSONL: `.data/trail-ar/math-log.jsonl`

## Open in WEKA (runbook §5)

1. Java 17+ and the kit `weka.jar`.
2. `java -cp "<kit>\formspace\weka\deps\weka.jar" weka.gui.GUIChooser`
3. Explorer → Preprocess → Open file → **prediction** ARFF first. Confirm `actual=?` so accuracy cannot be scored.
4. Open the **feature** ARFF only to inspect columns. Do not Classify → J48 on prediction columns and call that NLM validation.
5. Weka scores supplied distributions when labels exist. This PXL pass has no labels.

WEKA step executed locally: write both ARFFs + bind 188 `/api/nlm/weka-features` and `/api/nlm/decision-path`. No Java Explorer GUI on this machine unless `java` is on PATH.

## Backbone wired

`lib/fusarium/bluesight/formspace-nlm.ts` + `/api/fusarium/bluesight-trail/nlm` + math console on `/natureos/bluesight-trail`. Civil/civic later.
