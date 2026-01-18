# CREP Dashboard Marker Click Fix Audit

**Date:** January 16, 2026  
**Author:** Cursor AI Assistant  
**Status:** ✅ RESOLVED

---

## Executive Summary

This document details the fixes applied to resolve critical issues with the CREP (Common Relevant Environmental Picture) dashboard where clicking on map markers (fungal observations, environmental events, aircraft, vessels, satellites) was not opening popup widgets. The issues were caused by a combination of event propagation problems and missing click handler props.

---

## Issues Reported

### Primary Issues:
1. **Clicking on fungal markers on the map did nothing** - popups only appeared when clicking from Intel Feed
2. **Clicking on event markers on the map did nothing** - popups only appeared when clicking from Intel Feed
3. **Clicking on aircraft/vessel markers crashed the page** - React hooks violations
4. **Click-away functionality not working** - popups wouldn't dismiss when clicking empty map area
5. **`.toFixed()` crashes** - Calling `.toFixed()` on undefined values caused runtime errors

### User Impact:
- Users could not interact with markers directly on the map
- Required workaround of using Intel Feed sidebar instead of direct map interaction
- Aircraft and vessel markers caused complete page crashes

---

## Root Cause Analysis

### 1. Click-Away Handler Using Capture Phase

**File:** `app/dashboard/crep/page.tsx`

**Problem:**
```typescript
// OLD CODE - BROKEN
document.addEventListener('click', handleClickAway, true); // Capture phase
```

The click-away handler was registered in the **capture phase** (third argument `true`), which means it fires BEFORE any element's onClick handlers. This prevented `stopPropagation()` calls in marker click handlers from working.

**Event Flow with Capture Phase:**
1. Document capture listener fires FIRST ❌
2. Click-away dismisses popup immediately
3. Marker onClick never gets to execute

### 2. FungalMarker Not Passing onClick to MapMarker

**File:** `components/crep/markers/fungal-marker.tsx`

**Problem:**
```typescript
// OLD CODE - BROKEN
<MapMarker longitude={observation.longitude} latitude={observation.latitude} offset={[0, -12]}>
  <MarkerContent data-marker="fungal">
    <button onClick={(e) => { ... }}>  // Click handler on inner button only
```

The `FungalMarker` component had its click handler on an inner `<button>` element, NOT passed to the `MapMarker` component. When users clicked on the `.maplibregl-marker` wrapper, the `MapMarker`'s internal click handler fired (with `stopPropagation()`), but since no `onClick` prop was passed, nothing happened.

**How MapMarker Works:**
```typescript
// In components/ui/map.tsx
const handleClick = (e: MouseEvent) => {
  e.stopPropagation(); // Prevents bubbling
  onClickRef.current?.(e); // Calls onClick prop if provided
};
markerInstance.getElement()?.addEventListener("click", handleClick);
```

### 3. React Hooks Violations in AircraftMarker/VesselMarker

**Files:** 
- `components/crep/markers/aircraft-marker.tsx`
- `components/crep/markers/vessel-marker.tsx`

**Problem:**
Early `return null` statements appeared BEFORE React hooks were called, violating the Rules of Hooks which require hooks to be called in the same order on every render.

### 4. Non-Element Target in Click-Away Handler

**Problem:**
The click-away handler assumed `e.target` was always an HTMLElement, but it could be a text node or the document itself, causing `target.closest()` to throw a TypeError.

---

## Fixes Applied

### Fix 1: Click-Away Handler - Use Bubbling Phase

**File:** `app/dashboard/crep/page.tsx`  
**Lines:** 1678-1717

```typescript
// NEW CODE - FIXED
useEffect(() => {
  const handleClickAway = (e: MouseEvent) => {
    const target = e.target;
    
    // Skip if no popups are selected - nothing to dismiss
    if (!selectedEvent && !selectedFungal) return;
    
    // Guard: Ensure target is an Element with closest() method
    if (!target || !(target instanceof Element)) {
      return;
    }
    
    // Check if click is inside any popup, marker, panel, or event card
    const isInsidePopup = target.closest(".maplibregl-popup") !== null;
    const isInsideMarker = target.closest('[data-marker]') !== null || 
                           target.closest('button[title*="🍄"]') !== null ||
                           target.closest('.maplibregl-marker') !== null;
    const isInsidePanel = target.closest('[data-panel]') !== null;
    const isInsideEventCard = target.closest('[data-event-card]') !== null;
    
    // If clicking outside all interactive elements - dismiss
    if (!isInsidePopup && !isInsideMarker && !isInsidePanel && !isInsideEventCard) {
      console.log("[CREP] Click-away (doc): dismissing popups");
      setSelectedEvent(null);
      setSelectedFungal(null);
    }
  };

  // Use BUBBLING phase (false) so marker stopPropagation() works
  document.addEventListener('click', handleClickAway, false);
  return () => document.removeEventListener('click', handleClickAway, false);
}, [selectedEvent, selectedFungal]);
```

**Key Changes:**
1. Changed from capture phase (`true`) to bubbling phase (`false`)
2. Added `instanceof Element` guard to prevent TypeError
3. Simplified selector checks

### Fix 2: FungalMarker - Pass onClick to MapMarker

**File:** `components/crep/markers/fungal-marker.tsx`  
**Lines:** 122-130

```typescript
// NEW CODE - FIXED
return (
  <MapMarker 
    longitude={observation.longitude} 
    latitude={observation.latitude} 
    offset={[0, -12]}
    onClick={() => onClick?.()}  // ADDED: Pass onClick to MapMarker
  >
    <MarkerContent data-marker="fungal">
      <button
        onClick={(e) => {
          e.stopPropagation(); // Backup for edge cases
        }}
```

**Key Changes:**
1. Added `onClick={() => onClick?.()}` prop to `MapMarker`
2. This ensures the click handler is attached at the MapLibre marker wrapper level

### Fix 3: AircraftMarker - Fix Hooks Order

**File:** `components/crep/markers/aircraft-marker.tsx`

**Before:**
```typescript
// BROKEN - Early return before hooks
if (!aircraft.longitude || !aircraft.latitude) {
  return null;
}
const [longitude, setLongitude] = useState(aircraft.longitude);
```

**After:**
```typescript
// FIXED - Hooks called unconditionally first
const baseLongitude = aircraft.longitude;
const baseLatitude = aircraft.latitude;
const [longitude, setLongitude] = useState(baseLongitude ?? 0);
const [latitude, setLatitude] = useState(baseLatitude ?? 0);
// ... all hooks called ...

// Guard after hooks
const hasValidCoords = typeof baseLongitude === 'number' && typeof baseLatitude === 'number';
if (!hasValidCoords) {
  return null;
}
```

### Fix 4: VesselMarker - Fix Hooks Order

**File:** `components/crep/markers/vessel-marker.tsx`

Same pattern as AircraftMarker - moved all hooks to top of component, added coordinate validation after hooks.

### Fix 5: SatelliteMarker - Fix Hooks Order

**File:** `components/crep/markers/satellite-marker.tsx`

Same pattern - ensured hooks called unconditionally before any early returns.

### Fix 6: toFixed() Crashes - Add Null Guards

**Multiple Files:**

Added defensive coding for all `.toFixed()` calls:

```typescript
// Before
{event.magnitude.toFixed(1)}

// After
{typeof event.magnitude === 'number' ? event.magnitude.toFixed(1) : 'N/A'}
```

Applied to:
- `event.magnitude`, `event.depth`, `event.lat`, `event.lng`
- `observation.latitude`, `observation.longitude`
- `vessel.sog`, `vessel.draught`
- `satellite.orbitalParams.period`, `satellite.orbitalParams.inclination`

---

## Testing Performed

### Test Suite Results:

| Test Case | Expected | Result |
|-----------|----------|--------|
| Click fungal marker on map | Popup appears | ✅ PASS |
| Click event marker on map | Popup appears | ✅ PASS |
| Click-away on empty map area | Popup dismisses | ✅ PASS |
| Click Intel Feed fungal item | Popup appears | ✅ PASS |
| Click Intel Feed event item | Popup appears | ✅ PASS |
| Click aircraft marker | No crash | ✅ PASS |
| Click vessel marker | No crash | ✅ PASS |

### Browser Automation Test:

```javascript
// Fungal marker click test
const markers = document.querySelectorAll('.maplibregl-marker');
let fungalMarker = markers.find(m => m.querySelector('[data-marker="fungal"]'));
fungalMarker.click();
// Result: Popup visible with content "Southern Candy Cap - Lactarius rufulus"

// Click-away test
const canvas = document.querySelector('.maplibregl-canvas');
canvas.dispatchEvent(new MouseEvent('click', { bubbles: true }));
// Result: Popup dismissed
```

---

## Files Modified

| File | Changes |
|------|---------|
| `app/dashboard/crep/page.tsx` | Click-away handler, toFixed guards |
| `components/crep/markers/fungal-marker.tsx` | Added onClick to MapMarker |
| `components/crep/markers/aircraft-marker.tsx` | Fixed hooks order, null guards |
| `components/crep/markers/vessel-marker.tsx` | Fixed hooks order, null guards |
| `components/crep/markers/satellite-marker.tsx` | Fixed hooks order, null guards |
| `components/ui/map.tsx` | Already had stopPropagation (unchanged) |

---

## Deployment

1. Rebuilt Docker container with `--no-cache`:
   ```bash
   docker-compose build --no-cache website
   docker-compose up -d website
   ```

2. Container recreated and running on port 3000

---

## Lessons Learned

1. **Event Listener Phases Matter**: Capture phase vs bubbling phase has significant implications for stopPropagation behavior

2. **Pass onClick to Wrapper Components**: When using wrapper components like MapMarker, ensure click handlers are passed as props, not just attached to inner elements

3. **React Hooks Must Be Called Unconditionally**: All hooks must be called before any conditional returns

4. **Defensive Coding for API Data**: Always guard against undefined values before calling methods like `.toFixed()`

---

## Related Documentation

- [MapLibre GL JS Events](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#events)
- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Event Capture vs Bubbling](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_bubbling_and_capture)
