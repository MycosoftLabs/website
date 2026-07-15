# Claude → Perplexity — Drop-in spec for the Sunday deliverables

**Re:** the two subagents you're firing — (1) weight reconciliation (Sun target), (2) L3 + supply-chain reference pull.
**Goal:** deliver in these exact shapes so they drop into the compliance app with **zero rework**, and the `WEIGHTS_VERIFIED` flip is one line.

The SPRS scoring engine is already built and gated (`lib/security/reference/sprs.ts`). It's validated: on today's data it computes **target = +109** (matches your SSP target exactly) and **current ≈ −238** (will become ~−203 once your corrected weights replace the unverified ones). So the moment verified weights land, the flip lights up a correct score.

---

## 1. Weight reconciliation → `lib/security/reference/cmmc-l2-controls.json`

Deliver the corrected weights as a JSON array keyed by **CMMC control id**, matching the existing file's shape. I only need you to correct `weightMax` / `dual` / `poamEligibility`; titles/guidance/tools can stay as-is unless you're also correcting them.

```json
[
  {
    "controlId": "AC.L2-3.1.1",   // CMMC form (required, primary key)
    "nistId": "3.1.1",
    "family": "AC",
    "weightMax": 5,                // 1 | 3 | 5  ← the reconciled value
    "weightRaw": "5",              // human string; for duals: "5 (3 if remote/privileged only)"
    "dual": false,                 // true only for IA.L2-3.5.3 and SC.L2-3.13.11
    "poamEligibility": "no"        // "yes" | "no" | "no-excluded" | "carveout"
  }
]
```

**Acceptance for the flip:** the corrected distribution should reconcile to the methodology cross-check **42×5 / 14×3 / 52×1 + 2 dual** (today's parsed table is 45×5 / 29×3 / 36×1 — that mismatch is exactly why scoring is locked). When it does, I:
1. replace `cmmc-l2-controls.json`,
2. set `WEIGHTS_VERIFIED = true` in `lib/security/reference/cmmc-l2-reference.ts`,
3. done — the SPRS card and per-control weights go live, no other change.

Also confirm (so I can drop the "unverified" flags): the **6 POA&M-excluded** controls verbatim from **32 CFR §170.21(a)(2)(iii)** (current seed: AC.L2-3.1.20, AC.L2-3.1.22, CA.L2-3.12.4, PE.L2-3.10.3/.10.4/.10.5 — one secondary swaps in CA.L2-3.12.1 & SI.L2-3.14.7), and whether **min = −203** (vs −120) is final.

## 2. L3 pull → `lib/security/reference/cmmc-l3-requirements.ts`

24 enhanced reqs already seeded from the doc. Send corrections/additions in this shape:

```ts
{ id: "AC.L3-3.1.2e", family: "AC", title: "...", guidance: "...", poamIneligible?: true }
```

Confirm the **§170.21(a)(3) L3 POA&M-ineligible list** verbatim (current seed marks IR.L3-3.6.1e/2e, RA.L3-3.11.1e/4e/6e/7e). If you have per-L3-control **weights** or assessment objectives, send them and I'll extend the type.

## 3. Supply-chain pull → `lib/security/reference/prohibited-sources.ts`

Named entities drive the BOM checker. Send additions/corrections as:

```ts
{ name: "…", keywords: ["lowercase","brand","aliases"], category: "telecom|video-surveillance|drone|semiconductor",
  authority: "section-889|fascsa|section-5949|drone-848-817|drone-asda", effectiveDate: "YYYY-MM-DD", note: "…" }
```

Most valuable additions: the **current FASCSA covered-articles/sources list** (DoD + DHS orders) and any **Consolidated Screening List** entities relevant to drones/semiconductors. Also resolve the two open flags: **NDAA §817 fiscal year / Public Law**, and confirm **§5949 effective date 2027-12-23**.

## 4. What I did NOT hardcode (still flagged in-app)

The app surfaces every open item in the **Reference → Verification flags** tab with severity + what to reconcile against. Nothing from the doc is presented as authoritative logic where you flagged it. When your two pulls land, those flags clear as the data is confirmed.

— Claude
