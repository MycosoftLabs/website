# Fusarium outcomes measurement and KO relay — 10 September 2026

Date: 10 September 2026  
Status: Implemented  
Honesty lock: **If it is not measured, say so. No fake numbers.**

## Source classes

| `source_class` | Meaning |
|---|---|
| `survey` | NASA-TLX, NIOSH WellBQ **scored domains**, rest/error/incident items submitted by a person |
| `telemetry` | Time on tool/tab/layer, duty-switch events, comments |
| `inferred` | Hypothesis from use + comments + survey text. Uncertainty required. Never a measured fatality reduction |
| `not_measured` | No comparable observation. UI shows **Not measured**, never `0` or `0.85` |
| `in_boundary_cui` | **Disabled / NOT_SUPPLIED** on this commercial Cursor/website/MAS path |

CUI-backed measures are **not available on this commercial surface**. They will land only after an SAO-authorized FedRAMP/GovCloud in-boundary path exists. Do not put CUI, FOUO, or customer military data in the repo, 3010, or MAS now. Mycosoft is **pursuing** CMMC L2 and is **not** CMMC compliant.

## What can be stated today

The package contains 180 proposed personas, published pay **examples**, and executable measurement arithmetic. **No Fusarium-specific reduction in stress, errors, injuries, or death has been measured.** Those fields are null, not zero. Hours saved do not become stress %, error %, or lives saved. Headcount consolidation does not become a casualty reduction. Negative results are preserved when later data worsens.

NASA-TLX is stored as instrument **points**. A drop from 60 to 45 is 15 points, not “25% less psychological stress.” NIOSH WellBQ item bank is **not** reproduced; the form accepts officially scored domain values plus comments.

Package claim: **22 calculation checks passed** (10 Python fixtures + 12 workbook). Display that count. Do not invent extra checks. Passing tests verifies arithmetic guards, not product effectiveness.

## Formulas (shown; unused until inputs exist)

Task labor: \(H_0=V m_0/60\), \(H_1=V(m_1+r+q)/60+s\), \(\Delta H=H_0-H_1\). Duty and rest are **separate** observations. Binary ARR is percentage **points**; RRR is relative percent; zero baseline makes RRR undefined. Wilson intervals require an asserted independent-observation model.

## Storage

Durable file `data/fusarium-personnel/measurement-store.json` (gitignored `data/`). Starts empty. A survey POST appends a real row. APIs: `/api/fusarium/personnel/surveys`, `/telemetry`, `/outcomes`.

## KO / command view

`/fusarium/personnel/outcomes` and ITDX **Outcomes / KO** tab. Decision-support table: labor, duty, rest, survey scores, inferred flags, **Not measured** where n=0. Not a live COP. SYNTHETIC briefing stays `live: false`.
