# Changelog: Unified Voice Integration - February 4, 2026

## Summary

Complete unification of voice input across the Mycosoft website. All voice interactions now route through the PersonaPlex Bridge (port 8999) for MAS Event Engine integration, CUDA warmup handling, and MYCA Brain routing.

## Changes

### Core Voice Infrastructure

#### PersonaPlexProvider.tsx
- **Changed**: `serverUrl` from `ws://localhost:8998/api/chat` to `ws://localhost:8999/api/chat`
- **Reason**: Route through PersonaPlex Bridge instead of direct Moshi for MAS integration

#### PersonaPlexWidget.tsx
- **Changed**: Default `serverUrl` to `ws://localhost:8999/api/chat`
- **Added**: Comment explaining bridge architecture

#### usePersonaPlex.ts
- **Changed**: Default `serverUrl` to `ws://localhost:8999/api/chat`
- **Added**: Comments explaining bridge vs direct Moshi

### Search Components

#### command-search.tsx
- **Added**: Import for `usePersonaPlexContext`, `Mic`, `MicOff`
- **Added**: PersonaPlex context hook usage
- **Added**: Voice transcript effect to populate search
- **Added**: Mic button in search input area
- **Added**: Voice status indicator in footer
- **Added**: Mic icon indicator on search button

#### enhanced-search.tsx
- **Added**: Import for `usePersonaPlexContext`, `Mic`, `MicOff`, `cn`
- **Added**: PersonaPlex context hook usage
- **Added**: Voice transcript effect to populate search
- **Added**: Mic button in search input with styling

#### mindex/search-input.tsx
- **Added**: Import for `usePersonaPlexContext`, `Mic`, `MicOff`, `useEffect`
- **Added**: PersonaPlex context hook usage
- **Added**: Voice transcript effect to populate search
- **Added**: Mic button in search input

### Page Components

#### app/natureos/mas/topology/page.tsx
- **Added**: Imports for `usePersonaPlexContext`, `Badge`, `cn`, `Mic`, `MicOff`
- **Added**: PersonaPlex context hook usage
- **Added**: Voice command state (`voiceCommand`, `selectedAgent`)
- **Added**: Voice command handler effect for topology navigation
- **Added**: Voice command button in header
- **Added**: Voice command display badge
- **Added**: Voice connection status indicator

#### app/natureos/ai-studio/page.tsx
- **Changed**: Replaced `UnifiedVoiceProvider` import with `usePersonaPlexContext`
- **Removed**: `FloatingVoiceButton` import (using global widget)
- **Removed**: `UnifiedVoiceProvider` wrapper component
- **Added**: PersonaPlex context hook usage
- **Added**: Voice command handler effect for tab navigation
- **Added**: PersonaPlex status card (shows connection and last transcript)
- **Added**: Connection status badge when offline

#### components/natureos/mindex-dashboard.tsx
- **Added**: Imports for `usePersonaPlexContext`, `Mic`, `MicOff`
- **Added**: PersonaPlex context hook usage
- **Added**: Voice command state (`voiceCommand`)
- **Added**: Voice command handler effect for section navigation
- **Added**: Voice command button in header
- **Added**: Voice command display with animation

#### components/crep/voice-map-controls.tsx
- **Removed**: `useVoiceChat` import
- **Removed**: `parseCommand` import
- **Added**: `usePersonaPlexContext` import
- **Changed**: Replaced `useVoiceChat` with `usePersonaPlexContext`
- **Added**: `toggleListening` callback
- **Updated**: Voice transcript handling to use PersonaPlex
- **Updated**: UI to show PersonaPlex connection status
- **Added**: Offline status message

#### components/dashboard/natureos-dashboard.tsx
- **Added**: Imports for `usePersonaPlexContext`, `Mic`, `MicOff`, `useCallback`
- **Added**: PersonaPlex context hook usage
- **Added**: Voice command state (`voiceCommand`)
- **Added**: Voice command handler effect for tab and page navigation

## Migration Notes

### For Developers

If you have components using `useVoiceChat`:
1. Replace with `usePersonaPlexContext()`
2. Update state destructuring (different property names)
3. Handle potential `null` context with defaults

### Breaking Changes

- `UnifiedVoiceProvider` is no longer needed at page level (use app-level `PersonaPlexProvider`)
- `useVoiceChat` should be replaced with `usePersonaPlexContext`
- Voice connections now require PersonaPlex Bridge (8999) instead of direct Moshi (8998)

## Testing Checklist

- [ ] PersonaPlex Bridge running on port 8999
- [ ] CUDA graphs compile successfully (60-90 seconds)
- [ ] Floating widget appears on all pages
- [ ] Command search mic button works
- [ ] Enhanced search mic button works
- [ ] MINDEX search mic button works
- [ ] Topology voice commands work
- [ ] AI Studio voice tab navigation works
- [ ] MINDEX dashboard voice navigation works
- [ ] CREP voice map controls work
- [ ] NatureOS dashboard voice navigation works

## Files Changed

```
components/voice/PersonaPlexProvider.tsx
components/voice/PersonaPlexWidget.tsx
hooks/usePersonaPlex.ts
components/command-search.tsx
components/enhanced-search.tsx
components/mindex/search-input.tsx
app/natureos/mas/topology/page.tsx
app/natureos/ai-studio/page.tsx
components/natureos/mindex-dashboard.tsx
components/crep/voice-map-controls.tsx
components/dashboard/natureos-dashboard.tsx
```

## Documentation Created

- `docs/UNIFIED_VOICE_INTEGRATION_FEB04_2026.md` - Full technical documentation
- `docs/VOICE_COMMANDS_QUICK_REFERENCE_FEB04_2026.md` - User quick reference
- `docs/CHANGELOG_VOICE_INTEGRATION_FEB04_2026.md` - This changelog
