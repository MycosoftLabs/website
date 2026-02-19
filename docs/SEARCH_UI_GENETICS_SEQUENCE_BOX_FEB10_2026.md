# Search UI: Genetics Sequence Box Update — Feb 10, 2026

## Summary

Updated the genetic sequence display in the Fluid Search genetics detail modal for better contrast and readability with the color-coded nucleotide text.

## Changes Made

### 1. DNASequenceViewer — Sequence Box Background

**File:** `components/visualizations/DNASequenceViewer.tsx`

**Before:**
- Background: `bg-black/40` (dark gray)
- Border: `border-white/8`

**After:**
- Background: `bg-gray-100 dark:bg-gray-800/60` (very light gray in light mode, softer gray in dark mode)
- Border: `border-gray-200 dark:border-white/10`

**Reason:** The dark gray background clashed with the colored A/T/G/C nucleotide text (green, red, blue, amber). A very light gray background improves contrast and readability in both light and dark themes.

**Affected locations:**
- Genetics widget → "View details" → full detail modal
- Any view that uses `DNASequenceViewer` in full (non-compact) mode

### 2. Hero Search — Gradient Overlay

**File:** `components/home/hero-search.tsx`

Adjusted the hero background gradient overlay (`from-background/60 via-background/40 to-background/80` → `from-background/80 via-background/50 to-background/90`) for improved visibility of content over the video background.

## Context

Part of a broader light/dark mode audit for the Fluid Search system. The genetics sequence box was identified as having poor contrast with the colored nucleotide text; this change addresses that without affecting other genetics UI elements.

## Related Documentation

- `docs/SEARCH_FLUID_WIDGETS_FEB06_2026.md` — Fluid Search widget architecture
- `docs/IN_APP_DETAIL_PATTERN_FEB10_2026.md` — Detail modal pattern used by genetics, chemistry, etc.
