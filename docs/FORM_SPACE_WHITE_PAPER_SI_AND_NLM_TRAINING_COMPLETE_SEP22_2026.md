# FormSpace White Paper, SI Terminology, and NLM Training Integration Complete — September 22, 2026

**Date:** September 22, 2026  
**Status:** Complete on localhost; not deployed  
**Related plan:** `FormSpace Paper Integration`  
**Plan todos:** canonical paper, scientific renderer, PDF figures, product excerpt, verification

## Scope

This task replaced the provisional FormSpace article with the publication-safe v1.1 white paper, upgraded its scientific rendering, rebuilt the FormSpace downloads catalog, migrated Mycosoft-facing AI terminology to SI terminology, and replaced the NLM/FormSpace live-arithmetic panels with the real NLM training application.

## Delivered

- `docs/ai/formspace.md`
  - Uses the supplied v1.1 public-review source outside the intentionally expanded abstract.
  - Includes the approved detailed abstract describing FormSpace, NLM coordinates, Platonic space, experimental evidence, governance, and limitations.
  - Contains no ITDX, Army, military, launcher-command, or fixed parameter-count references.
- `app/docs/ai/formspace/page.tsx`
  - Renders frontmatter, complete section hierarchy, detailed document role, and a scrollable section navigator matched to the document-role panel height.
- `components/docs/formspace-paper-renderer.tsx`
  - Renders 26 KaTeX equations in highlighted model-math panels.
  - Renders algorithms, six responsive tables, inline code, citations, and both paper figures.
- `public/assets/formspace-white-paper/`
  - Exact recovery and architecture figures extracted from the supplied PDF.
- `app/ai/formspace/page.tsx`
  - Uses the canonical paper’s expanded Abstract and Purpose sections.
  - The live-arithmetic section was removed.
- `app/ai/formspace/downloads/page.tsx` and `lib/model-downloads.ts`
  - Detailed software, demonstrator, harness, models/versions, weights, and source-data catalog.
  - Uses GitHub, Hugging Face, and Mycosoft logos.
  - Real links open verified artifacts; future releases are labeled release pending.
- `components/natureos/nlm-training/NlmTrainingApplication.tsx`
  - Extracts the real existing NLM training application into one reusable component.
  - The same application now powers `/natureos/model-training` and appears directly below the `/myca/nlm` hero.
  - The NLM live-arithmetic section was removed.
- Global public terminology
  - Main desktop and mobile dropdowns now say SI.
  - AI Overview became SI Overview.
  - Mycosoft-authored visible AI/artificial-intelligence copy became SI/superintelligence.
  - Technical routes, APIs, identifiers, and exact third-party names remain compatible.
- Homepage
  - Tagline is `Operational Environmental Superintelligence`.
  - FormSpace dropdown subtext is `Environmental Platonic Map`.

## Verification

- `npx vitest run lib/formspace-paper.test.ts lib/nlm-training-integration.test.ts`
  - 9 tests passed.
- Publication-source comparison
  - Updated supplied v1.1 source matches the canonical site paper outside the deliberately expanded abstract.
  - 26 equation tags retained.
  - Excluded-term scan returned no matches.
- Local route smoke tests returned HTTP 200:
  - `/`
  - `/ai`
  - `/ai/formspace`
  - `/docs/ai/formspace`
  - `/ai/formspace/downloads`
  - `/myca/nlm`
  - `/myca/nlm/downloads`
  - `/natureos/model-training`
- Browser verification
  - 26 highlighted KaTeX displays.
  - Six responsive tables.
  - Both PDF figures.
  - No literal Pandoc width attributes.
  - No horizontal page overflow at 375 px.
  - Section navigator matches the document-role height and scrolls independently.
  - The real NLM training app is visible directly beneath the NLM hero on desktop and mobile.
  - No `Live arithmetic` copy remains on NLM or FormSpace.
- `git diff --check`
  - Passed; only repository line-ending warnings were reported.
- Full TypeScript check
  - Reached existing unrelated route-handler, CREP, Earth Simulator, Jest configuration, and Launchpad typing failures.
  - No FormSpace renderer or NLM training integration error remained in the final output.

## Operational state

- Local dev server: `http://localhost:3010`, HTTP 200.
- The production build was stopped after it stalled and displaced the dev server; the external dev server was restored.
- No commit, push, sandbox deployment, container restart, or Cloudflare purge was performed.

## Known follow-up

- The repository-wide pre-existing TypeScript failures must be resolved before a clean full production build can be claimed.
- Model weights and source datasets remain release-pending until real signed artifacts and final host URLs exist.
