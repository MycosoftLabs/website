# Nav Product Icon Square Fill Fix — Sep 22, 2026

**Date:** Sep 22, 2026  
**Status:** Complete  
**Scope:** Site chrome (Header + mobile nav) — SI / NatureOS / Defense / Droids / Apps product marks

## Problem

1. First pass clipped floating SVG fragments but used `scale-90` + `object-contain`, which left marks undersized and rectangular.
2. Nested lockups did not force a true square fill.

## Fix

- **ProductIcon** (`current`): square SVG with `preserveAspectRatio="xMidYMid slice"`, `overflow-hidden`, no shrink scale — glyph fills the box (cover) and clips tips.
- **ProductIcon** (glass/bitmap): `object-cover` again.
- **ProductGlassIconCycle**: restored `object-cover`.
- **Header / mobile-nav**: square frame (`size-4` / `size-5`) with icon `absolute inset-0 size-full`.
- **ModeToggle**: vertical thumb centering kept (`top: 50%` + `margin-top: calc(var(--ball) / -2)`).

## Files

- `components/brand/product-icon.tsx`
- `components/brand/product-glass-icon-cycle.tsx`
- `components/header.tsx`
- `components/mobile-nav.tsx`
- `components/mode-toggle.tsx` (theme thumb only; unchanged this pass)
