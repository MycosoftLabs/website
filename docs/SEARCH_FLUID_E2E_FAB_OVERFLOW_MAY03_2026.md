# Fluid Search — FAB clipping and E2E stability (May 03, 2026)

**Date:** May 03, 2026  
**Status:** Operational notes  

## Summary

Playwright widget tests timed out waiting for `data-testid="fast-action-*"` (e.g. genetics, weather) even though the FAB opened. Root cause: **`FastActionRadial`** lived inside **`FluidSearchCanvas`** regions using **`overflow-hidden`**. The radial menu is a **~300×300** layer with buttons at **radius ~130**; **`absolute bottom-3 right-3`** positioning kept the layer **inside** the clipped subtree, so slots were **not visible** to Playwright’s **`toBeVisible`**.

## Fixes (May 03, 2026)

1. **`components/search/fluid/FastActionRadial.tsx`**  
   - Outer wrapper: **`fixed`** with **`z-[9999]`**, safe-area-aware bottom offset, **`createPortal(..., document.body)`** when `document` is defined so the FAB escapes **`overflow-hidden`** and **framer-motion `transform`** ancestors that break `fixed` hit-testing.  
   - **Adaptive `radius`** when many slots (8+ / 12+) so buttons stay within the hit area.

2. **`components/search/fluid/FluidSearchCanvas.tsx`**  
   - Render **`<FastActionRadial />` as a sibling** of the **`flex-1 … overflow-hidden`** column (not inside it), paired with the FAB **`fixed`** change.

3. **`e2e/widgets/helpers/widget-test-utils.ts`**  
   - After opening the FAB: **`waitFor({ state: 'attached' })`**, **`scrollIntoViewIfNeeded`**, then **`toBeVisible`** with a bounded timeout.  
   - **`fast-action-fab`**: wait up to **90s** for attach/visible (Suspense + cold dev compile before portal FAB exists).

4. **`playwright.config.ts`**  
   - Explicit **`viewport: { width: 1280, height: 800 }`** under **`use`** so **`sm:`** layout is stable for fluid search E2E.

## Related routing / contract work (same rebuild window)

- **`lib/search/search-intelligence-router.ts`**: For intents **`aircraft`**, **`vessel`**, **`satellite`**, primary widget is the domain tile; CREP can appear as **secondary** when worldview requests it.  
- **`lib/search/intent-parser.ts`**: **“LA”** maps to Los Angeles coordinates where context implies a place (e.g. “Planes over LA”).  
- **`lib/search/__tests__/fluid-search-contract.test.ts`**: Jest regression for “Planes over LA” routing.

## Runbook

- **Jest (contract):**  
  `npx jest lib/search/__tests__/fluid-search-contract.test.ts`

- **Playwright (widgets):**  
  Ensure Next is on **3010** (`npm run dev:next-only` in an **external** process), then:  
  `set PW_NO_WEB_SERVER=1` (Windows) or `PW_NO_WEB_SERVER=1 npx playwright test`  
  Or let **`playwright.config.ts`** start **`npm run dev:next-only`** (do **not** pipe dev output through **`Select-Object -First N`** — that kills the process and causes false failures).

- **Full widget matrix:**  
  `npm run test:e2e:widgets` (from **website** repo).
