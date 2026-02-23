# Hero Videos Mobile Autoplay Fix - Feb 22, 2026

## Summary

Fixed hero section videos across all device pages and the homepage to autoplay reliably on mobile and tablet. Videos were previously only playing on desktop due to explicit hiding and iOS autoplay restrictions.

## Changes Made

### 1. Home Hero Search (`components/home/hero-search.tsx`)

- **Removed** `hidden sm:block` from the video element - the video was explicitly hidden on viewports below 640px
- **Added** `preload="auto"` for faster loading on mobile
- **Added** `videoRef` and programmatic `play()` in useEffect with touchstart listener (iOS requires user interaction before autoplay in some cases)

### 2. Mushroom1 Device Page (`components/devices/mushroom1-details.tsx`)

- **Changed** `preload="metadata"` to `preload="auto"` for better mobile loading
- **Added** useEffect with programmatic `video.play()` and touchstart handler for iOS reliability

### 3. SporeBase Device Page (`components/devices/sporebase-details.tsx`)

- **Added** `videoRef` and `preload="auto"` to the hero video
- **Added** useEffect with programmatic play and touchstart handler

### 4. Generic Device Details (`components/devices/device-details.tsx`)

- **Added** `videoRef` (video element ref) and `preload="auto"`
- **Added** useEffect with programmatic play and touchstart handler

### 5. Defense Portal (`components/defense/defense-portal-v2.tsx`)

- **Extracted** video into `DefenseHeroVideo` component
- **Added** `preload="auto"` and programmatic play with touchstart handler

## Technical Approach

### iOS Autoplay Requirements

- `muted` - Required for autoplay
- `playsInline` - Required to prevent fullscreen takeover
- `preload="auto"` - Ensures video is loaded
- Programmatic `play()` - Some iOS versions block declarative autoplay
- Touchstart listener - Triggers play on first user touch if autoplay was blocked

### Programmatic Play Pattern

```typescript
useEffect(() => {
  const v = videoRef.current
  if (v) {
    v.play().catch(() => {})
    const handler = () => v.play().catch(() => {})
    document.addEventListener("touchstart", handler, { once: true })
    return () => document.removeEventListener("touchstart", handler)
  }
}, [])
```

## Pages Affected

| Page | Component | Video Source |
|------|-----------|--------------|
| Homepage | HeroSearch | mycosoft.org/videos/mycelium-bg.mp4 |
| /devices/mushroom-1 | Mushroom1Details | /assets/mushroom1/ (background or waterfall) |
| /devices/sporebase | SporeBaseDetails | /assets/sporebase/sporebase1publish.mp4 |
| /devices/[id] | DeviceDetails | device.video |
| /defense | DefensePortal | /assets/backgrounds/defense-hero.mp4 |

## Testing Checklist

- [ ] iPhone Safari - Home hero video autoplays
- [ ] iPhone Safari - Mushroom1 hero video autoplays
- [ ] iPhone Safari - SporeBase hero video autoplays
- [ ] iPad Safari - All hero videos autoplay
- [ ] Android Chrome - All hero videos autoplay
- [ ] Desktop - Videos still autoplay (no regression)

## Related Documentation

- `docs/MOBILE_SEARCH_CHAT_IMPLEMENTATION_FEB22_2026.md` - Mobile search chat
- `docs/DEVICE_MEDIA_ASSETS_PIPELINE.md` - Device media assets
