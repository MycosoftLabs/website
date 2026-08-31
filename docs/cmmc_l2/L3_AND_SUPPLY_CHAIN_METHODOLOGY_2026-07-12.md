# CMMC Level 3 + Defense Supply-Chain Reference — Methodology & Source Notes

**Prepared for:** Mycosoft, LLC compliance web app (repo: MycosoftLabs/website) — supply-chain BOM check (Psathyrella buoy, Mushroom 1 quadruped, Hyphae sensor array) and L3 pre-readiness view.
**Delivery date:** 2026-07-12
**Companion files:** `cmmc-l3-controls.json`, `supply-chain-prohibitions.json`, `cui-categories.json`

This document explains how each JSON deliverable was built, cites every primary source used, and flags every place where a claim could not be independently verified against a primary source as of this research date.

---

## 1. Methodology overview

All three JSON files were built from primary-source regulatory and statutory text wherever that text could be directly retrieved, rather than from secondary summaries. Two retrieval techniques were used for sources that block conventional page fetches:

- **eCFR sections** (32 CFR Part 170, the CMMC Program rule) render as JavaScript-only pages that return empty content on a direct fetch. The workaround was to call the eCFR Versioner API XML endpoint directly — `https://www.ecfr.gov/api/versioner/v1/full/2026-07-01/title-32.xml?part=170` — which returns the full verbatim regulatory text as machine-readable XML. This is the authoritative source for every 32 CFR §170.14, §170.18, §170.21, and §170.24 citation in this deliverable set. A human-readable rendering of the same text is available at [eCFR §170.14](https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-170/subpart-B/section-170.14) and its Cornell Law mirror, [32 CFR §170.14 (Cornell LII)](https://www.law.cornell.edu/cfr/text/32/170.14).
- **NIST SP 800-172 (Feb2021)** full-text PDF was fetched and its Chapter 3 enhanced security requirements were extracted verbatim, including page numbers (12–30) and discussion/guidance text, for all 24 requirements selected for CMMC Level 3. Source: [NIST SP 800-172, csrc.nist.gov](https://csrc.nist.gov/pubs/sp/800/172/final) ([full PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-172.pdf)).

Every field in the three JSON files carries either a `citation` / `citation_url` field pointing to the primary source used, or `verified: false` with `citation: "PENDING"` where a primary source could not be retrieved directly during this research pass, per the task's discipline rule.

---

## 2. `cmmc-l3-controls.json` — CMMC Level 3 (24 selected NIST SP 800-172 requirements)

### 2.1 Source and construction

The 24 CMMC Level 3 security requirements are codified verbatim at **32 CFR §170.14(c)(4), Table 1**, which selects a subset of NIST SP 800-172 (Feb2021) enhanced security requirements and fills in DoD's Organization-Defined Parameters (ODPs) directly into the requirement text. This is the single authoritative source for the *exact regulatory text with ODPs resolved* ([eCFR §170.14](https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-170/subpart-B/section-170.14); [Cornell Law mirror](https://www.law.cornell.edu/cfr/text/32/170.14)).

For each control, the JSON carries two parallel text fields, both verbatim and neither paraphrased, per the task's discipline rule:

- `verbatim_title_nist_800_172` — the original NIST SP 800-172 requirement statement *as published*, with `[Assignment: organization-defined ...]` / `[Selection: ...]` bracket placeholders intact (e.g., requirement 3.5.1e reads "Identify and authenticate **[Assignment: organization-defined systems and system components]** before establishing a network connection...").
- `cfr_text_with_dod_odp` — the same requirement as it appears in 32 CFR §170.14(c)(4) Table 1, with DoD's specific ODP values filled in (e.g., the same requirement reads "Identify and authenticate **systems and system components, where possible,** before establishing a network connection...").

The `discussion_guidance_nist_800_172` and `page_number_nist_800_172` fields come from the NIST SP 800-172 (Feb2021) full-text PDF discussion sections accompanying each requirement, extracted directly from the publication ([NIST SP 800-172 full PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-172.pdf)).

### 2.2 Prerequisite, scoring, and POA&M rules

- **Prerequisite:** An OSC must hold a CMMC Status of Final Level 2 (C3PAO) on the Level 3 Assessment Scope before a Level 3 certification assessment (performed exclusively by DCMA DIBCAC) may begin. Source: **32 CFR §170.18(a)(1)** ([eCFR §170.18](https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-170/subpart-B/section-170.18)).
- **Scoring:** Level 3 uses a flat 1-point value per requirement (unlike Level 2's weighted 1/3/5-point scheme), with a maximum score of 24. Source: **32 CFR §170.24(c)(3)** ([eCFR §170.24](https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-170/subpart-B/section-170.24)).
- **POA&M threshold:** A Conditional Level 3 (DIBCAC) status requires an assessment score ÷ total Level 3 requirements ≥ 0.8, and the POA&M must exclude any of seven named controls (see §2.3 below). A POA&M closeout assessment (performed by DCMA DIBCAC) must confirm closure within 180 days of the Conditional status date, or the Conditional status expires. Source: **32 CFR §170.21(a)(3)** and **§170.21(b)(3)**.

### 2.3 Correction to the task brief's illustrative POA&M example

**The task brief's example schema referenced six POA&M-ineligible controls; the authoritative regulatory text at 32 CFR §170.21(a)(3)(ii) lists seven.** This deliverable uses the verified count of seven, not six, since the task brief's example was illustrative rather than an authoritative source claim. The seven controls ineligible for POA&M treatment at Level 3 are:

1. IR.L3-3.6.1e — Security Operations Center
2. IR.L3-3.6.2e — Cyber Incident Response Team
3. RA.L3-3.11.1e — Threat-Informed Risk Assessment
4. RA.L3-3.11.6e — Supply Chain Risk Response
5. RA.L3-3.11.7e — Supply Chain Risk Plan
6. RA.L3-3.11.4e — Security Solution Rationale
7. SI.L3-3.14.3e — Specialized Asset Security

This list is reproduced verbatim from 32 CFR §170.21(a)(3)(ii)(A)–(G).

### 2.4 NIST SP 800-172 (Feb2021) publication-status nuance

NIST **withdrew** SP 800-172 (Feb2021) on **May 13, 2026**, superseding it with **NIST SP 800-172 Revision 3** (May 2026, DOI: [10.6028/NIST.SP.800-172r3](https://doi.org/10.6028/NIST.SP.800-172r3)). However, **32 CFR §170.14 incorporates "NIST SP 800-172 Feb2021" by reference, by name and date**, per 32 CFR §170.2's incorporation-by-reference table. Until the CFR itself is amended to point to a newer revision, **the Feb2021 version remains the legally operative source for CMMC Level 3 control language**, not SP 800-172r3. This deliverable therefore cites the Feb2021 text throughout and explicitly flags this nuance so the compliance app does not silently drift to citing the wrong NIST revision as new updates roll out over the coming Level 3 rulemaking cycle.

---

## 3. `supply-chain-prohibitions.json` — Section 889 / FASCSA / NDAA 5949 / drones / ITAR-EAR

### 3.1 Section 889 (Parts A and B)

Section 889 of the John S. McCain NDAA for FY2019 ([Pub. L. 115-232 / H.R. 5515, congress.gov](https://www.congress.gov/bill/115th-congress/house-bill/5515)) is implemented via **FAR 52.204-25** ([acquisition.gov](https://www.acquisition.gov/far/52.204-25)). Part A (effective August 13, 2019) bars federal procurement of covered telecom/video-surveillance equipment from Huawei and ZTE (named directly in the clause). Part B (effective August 13, 2020) additionally bars contracting with *any* entity that uses such equipment anywhere in its own operations — naming Hytera, Hikvision, and Dahua for the video-surveillance/public-safety/critical-infrastructure use case, plus a catch-all for subsidiaries, affiliates, and any entity DoD/DNI/FBI reasonably believes is government-controlled by a "covered foreign country" (the People's Republic of China, per this specific clause's definition).

### 3.2 FASCSA and the CISA guidance gap

The Federal Acquisition Supply Chain Security Act establishes the Federal Acquisition Security Council (FASC) and its authority to issue removal/exclusion orders ([41 U.S.C. §1323, Cornell Law](https://www.law.cornell.edu/uscode/text/41/1323)), implemented via **FAR 52.204-30** ([acquisition.gov](https://www.acquisition.gov/far/52.204-30)). **Known gap:** CISA's public FASCSA/ICT-supply-chain guidance page could not be retrieved directly during this research pass — the fetch was blocked by the site's access controls (`bad_robots_code`). The FAR clause text itself remains fully verified and is the primary implementation reference; the CISA guidance gap is flagged explicitly in the `known_gaps` array of `supply-chain-prohibitions.json` with `verified: false` and `citation: "PENDING"`.

### 3.3 NDAA Section 5949 — the SMIC/CXMT/YMTC nuance

Section 5949 of the James M. Inhofe NDAA for FY2023 ([Pub. L. 117-263](https://www.congress.gov/bill/117th-congress/house-bill/7776)) prohibits federal procurement, for use in national security systems, of semiconductor products from SMIC, CXMT, or YMTC, effective **December 23, 2027**. The FAR Council's proposed implementing rule was published February 17, 2026, with comments closing April 20, 2026 ([Federal Register, govinfo.gov](https://www.govinfo.gov/content/pkg/FR-2026-02-17/pdf/2026-03065.pdf)); it was not yet final as of this research date.

**Critical distinction verified this session:** SMIC is on the **BIS Entity List** (added December 2020, per contemporaneous reporting from [Wiley Rein LLP](https://www.wiley.law/alert-Commerce-Bans-Exports-to-Dozens-of-Companies-Including-Chinese-Semiconductor-Drone-Manufacturers)), but **CXMT and YMTC are not** — they instead appear on the **DoD Section 1260H "Chinese Military Companies" list**, most recently updated June 8, 2026 to add them back in after a brief removal ([Reuters, June 8, 2026](https://www.reuters.com/world/asia-pacific/pentagon-lists-entities-designated-chinese-military-company-2026-06-08/)). These are legally distinct mechanisms (Commerce/EAR export-control listing vs. DoD military-company designation), and a compliance app must not conflate them. Further, per a Semiconductor Industry Association comment letter on the proposed Section 5949 rule, a statutory cross-reference quirk (Section 5949(j)(2) vs. (j)(3)) means the proposed rule's disclosure trigger (FAR 52.240-YY(g)) currently designates only SMIC — not CXMT or YMTC — as a "semiconductor covered entity" for disclosure purposes. This is marked `verified: false` / `citation: "PENDING"` for CXMT and YMTC's disclosure-designation status pending the final rule.

A separate mechanism, **Section 805** (tied to the Section 1260H list), bars DoD from contracting directly with any of the 188 listed Chinese military companies starting **June 30, 2026**, and from buying their products/services via third parties starting **2027** — broader in scope than Section 5949's three named semiconductor makers.

### 3.4 Drone/UAS prohibitions — resolving the working doc's open question

The working document flagged uncertainty over whether NDAA Section 817 belongs to the FY23 or FY24 NDAA. **This is resolved: Section 817 is part of the FY2023 NDAA, Pub. L. 117-263** — the same public law as Section 5949 above. Section 817 amends the original Section 848 (FY2020 NDAA, [Pub. L. 116-92](https://www.congress.gov/bill/116th-congress/senate-bill/1790)) drone-procurement ban by expanding the covered-foreign-country list beyond the PRC to include Russia, Iran, and North Korea, and adds a DJI-specific contracting prohibition effective **October 1, 2024**. The verbatim implementing text is reproduced in **OSD Class Deviation 2024-O0014** (dated August 28, 2024), available at [acq.osd.mil](https://www.acq.osd.mil/dpap/policy/policyvault/USA001878-24-DPCAP.pdf) — this URL is used in preference to the task brief's original `.docx` link, which may be stale.

Two additional, legally distinct drone-related instruments were identified and incorporated this session, both outside the original task brief's source list but directly relevant to Mycosoft's BOM check:

- The **American Security Drone Act** (FY2024 NDAA §§1821–1832, [Pub. L. 118-31](https://www.congress.gov/bill/118th-congress/house-bill/2670)) — a government-wide (not DoD-only) ban, implemented via the newly issued **FAR 52.240-1** ([acquisition.gov](https://www.acquisition.gov/far/52.240-1)), with the operation ban and contractor/grantee federal-funds ban taking effect **December 22, 2025**.
- The **FCC Covered List** expansion (FY2025 NDAA §1709) adding DJI, Autel, and foreign-made UAS critical components effective **December 22–23, 2025**, and a further June 2026 expansion adding legacy Huawei/ZTE/Hytera/Hikvision/Dahua equipment effective **July 2026** ([TechStory, June 28, 2026](https://techstory.in/fcc-expands-chinese-tech-import-ban-to-cover-legacy-huawei-zte-and-hikvision-equipment-from-july-2026/)).

### 3.5 BIS Entity List — verified status by name

Per task discipline ("prohibited-entity lists must match the current BIS Entity List and current FAR clause text — check dates"), each named entity's BIS Entity List status was checked individually rather than assumed from its appearance on any other list:

| Entity | On BIS Entity List? | Alternative listing mechanism |
|---|---|---|
| Huawei Technologies | Yes (2019–2021) | Section 889 (named directly) |
| ZTE Corporation | Not currently confirmed on Entity List | Section 889 (named directly) |
| SMIC | Yes (December 2020) | — |
| DJI | Yes (December 2020) | NDAA §817, ASDA, FCC Covered List |
| CXMT | No | DoD Section 1260H list |
| YMTC | No | DoD Section 1260H list |
| Hikvision | No | Section 889 Part B, DoD 1260H, FCC Covered List |
| Dahua | No | Section 889 Part B, DoD 1260H, FCC Covered List |
| Hytera | No | Section 889 Part B (named directly) |

Sources: [BIS Entity List FAQs PDF](https://www.bis.gov/media/documents/entity-list-faqs.pdf); [Wiley Rein LLP, SMIC/DJI 2020 listing](https://www.wiley.law/alert-Commerce-Bans-Exports-to-Dozens-of-Companies-Including-Chinese-Semiconductor-Drone-Manufacturers); [DoD Section 1260H list, media.defense.gov](https://media.defense.gov/2025/Jan/07/2003625471/-1/-1/1/ENTITIES-IDENTIFIED-AS-CHINESE-MILITARY-COMPANIES-OPERATING-IN-THE-UNITED-STATES.PDF); [Reuters, June 8, 2026 update](https://www.reuters.com/world/asia-pacific/pentagon-lists-entities-designated-chinese-military-company-2026-06-08/).

### 3.6 Made-in-America statutes (light verification)

The Buy American Act (41 U.S.C. §§8301–8305, FAR Part 25), Trade Agreements Act (19 U.S.C. §2501 et seq.), and Berry Amendment (10 U.S.C. §4862) were verified only against general statute citations, per the task's guidance that these needed light verification given the step budget. All three remain in force with no material 2026 amendments identified during this research pass.

### 3.7 BOM check advice — data availability by platform

Mycosoft's own internal build documentation was consulted to ground the `bom_check_advice_for_mycosoft` field in real component data rather than generic guidance:

- **Psathyrella buoy:** A detailed internal BOM exists (`psathyrella_buoy_unit1_bom.md`), documenting predominantly U.S.-origin compute (NVIDIA Jetson Orin Nano) and sensor vendors (Adafruit, SparkFun, Blue Robotics, Aquarian Audio, Atlas Scientific, Garmin). No Section 889/1260H-listed camera or telecom vendor was identified in this BOM, though the Sony block camera and LoRa radio module's precise country-of-origin and OEM sub-supplier chain were not independently traced during this pass.
- **Mushroom 1 quadruped** and **Hyphae sensor array:** No dedicated BOM documentation exists yet in the workspace for either platform. BOM check advice for these two platforms is therefore necessarily generic and flagged as such in the JSON's `known_gaps` array — notably, the advice highlights that Unitree, a China-based quadruped robotics manufacturer, appears on the DoD Section 1260H list, which is a directly relevant competitive/supply-chain risk signal for the quadruped hardware category even though it says nothing about Mushroom 1's own actual components.

---

## 4. `cui-categories.json` — NARA CUI Registry categories

Five categories were selected to match the task's schema (SP-CTI, SP-EXPT, SP-PROPIN, ISVI, and general/basic CUI), each fetched directly from its NARA CUI Registry category-detail page:

- [Controlled Technical Information](https://www.archives.gov/cui/registry/category-detail/controlled-technical-info.html) — `CUI//SP-CTI`, authority 48 CFR 252.204-7012 (Specified).
- [Export Controlled](https://www.archives.gov/cui/registry/category-detail/export-control.html) — `CUI//SP-EXPT` (Specified) / `CUI` (Basic), authorities include 22 CFR 120.21 (ITAR) and 15 CFR 736 Supp. 2 (EAR).
- [General Proprietary Business Information](https://www.archives.gov/cui/registry/category-detail/proprietary-business-info.html) — `CUI//SP-PROPIN` (Specified) / `CUI` (Basic), authority 48 CFR 52.203-13 (Specified).
- [Information Systems Vulnerability Information](https://www.archives.gov/cui/registry/category-detail/info-systems-vulnerability-info.html) — Basic-only category, marking `ISVI`, banner `CUI` (with `CUI//ISVI` as an alternative banner for Basic authorities), authorities 44 U.S.C. §3554 and §3555(f).
- **General/Basic CUI** — the residual Basic category applying when no more specific NARA subcategory applies, per the [NARA CUI Registry marking list](https://www.archives.gov/cui/registry/category-marking-list).

All category markings and banner text in the JSON are copied character-for-character from the NARA Registry pages, per the task's discipline rule to use exact category markings rather than paraphrased approximations. The CUI Basic-vs-Specified distinction and the marking/decontrol rules are sourced from [32 CFR §2002.4(h)](https://www.law.cornell.edu/cfr/text/32/2002.4) and [32 CFR §2002.18](https://www.law.cornell.edu/cfr/text/32/2002.18) respectively (Cornell Law mirrors of the eCFR text, used because direct eCFR fetches of Part 2002 render empty via the same JavaScript-rendering issue affecting Part 170).

---

## 5. Known gaps and items marked `verified: false`

The following items could not be fully verified against a primary source during this research pass and are explicitly marked `verified: false` with `citation: "PENDING"` in the relevant JSON file, consistent with the task's discipline rule:

1. **CISA FASCSA guidance page** — blocked by site access controls; only the FAR 52.204-30 clause text was used as the verified primary source.
2. **FAR 52.240-YY final rule (NDAA Section 5949 implementation)** — not yet finalized as of this research date; the CXMT/YMTC disclosure-designation question under the proposed rule's statutory cross-reference remains open.
3. **Mushroom 1 quadruped and Hyphae sensor array BOMs** — no internal documentation exists yet; BOM check advice for these platforms is generic rather than component-specific.
4. **ZTE Corporation's current BIS Entity List status** — Section 889 names ZTE directly in the statute/clause regardless of Entity List status, but an independent, current confirmation of ZTE's Entity List listing (separate from its historical export-control denial order) was not located during this pass.

No other field in any of the three JSON deliverables relies on an unverified secondary source; every other field cites a directly retrieved primary source URL.
