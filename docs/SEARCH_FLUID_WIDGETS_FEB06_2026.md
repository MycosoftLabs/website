# Search Fluid Widgets and Fallback – Feb 6, 2026

## Summary

1. **Search shows results for "Amanita muscaria"** – Fallback data now includes *Amanita muscaria* (Fly Agaric) in `lib/services/species-mapping.ts`. When MINDEX is unavailable, the unified search API returns this species plus compounds (e.g. Muscimol) from `lib/data/compounds.ts`.

2. **Revolutionary fluid widget experience** (per `REVOLUTIONARY_SEARCH_FEB05_2026.md`) implemented in `FluidSearchCanvas`:
   - **Animated fluid widgets** – Context widgets use a subtle floating animation (y: 0 → -5px → 0, repeating) with staggered timing. Focused widget uses spring layout animations.
   - **Draggable reorder** – Context (grid) widgets are draggable; drag one onto another to reorder. Visual feedback: dragged widget dims, drop target gets a ring. Grip handle hint in the top-left of each card.
   - **Resizable focused widget** – The main (focused) widget has a size cycle: compact (max-w-md) → normal (max-w-2xl) → large (max-w-4xl). Use the expand icon in the header to cycle; choice is persisted.
   - **Layering** – Focused widget is rendered first with higher z-index (20); context grid and minimized bar sit below.
   - **Persistent display** – Widget order, focused widget id, and focused size are stored in `sessionStorage` under `fluid-search-widget-layout`. On the next search (or refresh), order and focus are restored when the same result set is present.

## Files changed

| File | Change |
|------|--------|
| `lib/services/species-mapping.ts` | Added `amanita-muscaria` entry (Fly Agaric) with searchTerms, taxonomy, description, compounds, defaultImages. |
| `components/search/fluid/FluidSearchCanvas.tsx` | URL sync for `initialQuery`; `focusedSize` state and cycle; `draggedId`/`dropTargetId` and drag-to-reorder; sessionStorage load/save for layout; floating animation on context widgets; resize button and max-width by size; `WidgetRenderer` accepts `focusedSize` and `onResize`. |

## How to test

1. **Results for Amanita muscaria**  
   Open `http://localhost:3010/search?q=Amanita%20muscaria`.  
   You should see at least one species widget (Amanita muscaria) and one chemistry widget (e.g. Muscimol) when using fallback (e.g. MINDEX down or slow).

2. **Fluid widgets**  
   - **Reorder:** Drag a context (grid) card and drop it on another; order should update and persist after refresh.  
   - **Resize:** Focus a widget (click it); use the expand icon in the header to cycle compact → normal → large.  
   - **Persistence:** Refresh the page or run another search that returns the same widgets; order and focused widget/size should restore from session.

## Related docs

- `docs/REVOLUTIONARY_SEARCH_FEB05_2026.md`
- `docs/SEARCH_SYSTEM_COMPLETE_FEB05_2026.md`
- `docs/SEARCH_FIX_AND_VERIFICATION_FEB06_2026.md` (timeout and fallback behavior)
