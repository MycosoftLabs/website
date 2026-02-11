# Voice + Search Manual Testing Checklist - February 11, 2026

## Overview

This checklist covers comprehensive manual testing of the PersonaPlex voice integration with search functionality across all environments and devices.

**Tester**: ___________  
**Date**: ___________  
**Environment**: [ ] Local Dev [ ] Sandbox [ ] Production

---

## Pre-Test Setup

### Local Development Environment

- [ ] PersonaPlex Bridge running on port 8999
  - Start: `python scripts/start_myca_voice.py`
  - Verify: `curl http://localhost:8999/health`
  
- [ ] Moshi server running on port 8998
  - Verify: `curl http://localhost:8998/health`
  
- [ ] MAS Orchestrator reachable at 192.168.0.188:8001
  - Verify: `curl http://192.168.0.188:8001/health`
  
- [ ] Website dev server running on port 3010
  - Start: `npm run dev:next-only`
  - URL: http://localhost:3010
  
- [ ] GPU available with sufficient VRAM
  - Run: `nvidia-smi`
  - Should show RTX 5090 with ~22GB free

### Sandbox VM Environment

- [ ] Website deployed to Sandbox VM (192.168.0.187)
  - URL: https://sandbox.mycosoft.com
  - Verify container: `ssh mycosoft@192.168.0.187 "docker ps | grep mycosoft-website"`
  
- [ ] PersonaPlex deployed (if GPU available on Sandbox)
  - Verify: `curl http://192.168.0.187:8999/health`
  
- [ ] OR PersonaPlex accessible from MAS VM
  - Verify: `curl http://192.168.0.188:8999/health`
  
- [ ] Cloudflare cache purged
  - Go to Cloudflare Dashboard → Caching → Purge Everything

---

## Test 1: Floating Voice Button Visibility

### Desktop (Chrome, 1920x1080)

- [ ] Homepage (/) - Button visible in bottom-right
- [ ] Search page (/search) - Button visible
- [ ] Devices page (/devices) - Button visible
- [ ] Earth Simulator (/earth-simulator) - Button visible
- [ ] NatureOS (/natureos) - Button visible
- [ ] About page (/about) - Button visible
- [ ] Any random page - Button should persist

**Expected**: Floating mic button appears on all pages, fixed position, z-index above all content

### Mobile (iPhone 13, 390x844)

- [ ] Homepage - Button visible, not overlapping content
- [ ] Search page - Button visible, above bottom nav
- [ ] Scroll test - Button stays fixed while scrolling
- [ ] Landscape mode - Button repositions appropriately

**Expected**: Button is touch-friendly (min 48x48px), doesn't overlap nav, visible in all orientations

### Tablet (iPad Air, 820x1180)

- [ ] Homepage - Button visible
- [ ] Search page - Button visible
- [ ] Portrait mode - Button positioned correctly
- [ ] Landscape mode - Button repositions

**Expected**: Button adapts to tablet viewport, touch-friendly

---

## Test 2: Voice Connection Status

### Local Dev (localhost:3010)

- [ ] Load homepage → Button shows "disconnected" state initially
- [ ] Click button → Shows "connecting..." animation
- [ ] After ~2s → Shows "connected" with green indicator
- [ ] Status tooltip/label shows "Ready"

**Expected**: Clear visual feedback for connection state (disconnected, connecting, connected)

### Sandbox VM (sandbox.mycosoft.com)

- [ ] Load homepage → Button shows connection state
- [ ] If PersonaPlex unavailable → Shows "disconnected" gracefully
- [ ] If Web Speech fallback enabled → Still shows status
- [ ] Console shows connection attempts (if debug enabled)

**Expected**: Graceful fallback when PersonaPlex unavailable

---

## Test 3: Voice Listening Functionality

### Microphone Permissions

- [ ] Click voice button on first use
- [ ] Browser prompts for mic permission
- [ ] Click "Allow"
- [ ] Button shows "listening" state (red indicator, pulsing)

**Expected**: Browser native mic permission prompt, clear listening indicator

### Voice Input - Desktop

- [ ] Click voice button
- [ ] Speak clearly: "search for mushrooms"
- [ ] Wait ~1-2 seconds
- [ ] Should navigate to `/search?q=mushrooms`

**Voice commands to test**:
- [ ] "search for fungi species"
- [ ] "find information about mycelium"
- [ ] "show me devices"
- [ ] "what is MYCA"
- [ ] "look up agaricus bisporus"

**Expected**: Voice transcribed, search intent detected, navigated to search page with query

### Voice Input - Mobile

- [ ] Tap voice button
- [ ] Speak into phone: "search for spores"
- [ ] Should navigate to search with query

**Expected**: Same as desktop, works on mobile browser

---

## Test 4: Voice Search Integration

### From Homepage

- [ ] Click voice button
- [ ] Say: "search for edible mushrooms"
- [ ] Should navigate to `/search?q=edible mushrooms`
- [ ] Search results should load with query

**Expected**: Seamless transition from voice to search

### From Search Page

- [ ] Navigate to `/search`
- [ ] Click voice button
- [ ] Say: "fungi in North America"
- [ ] Search input should populate with query
- [ ] Results should update automatically

**Expected**: Voice populates search input, triggers search

### Voice Intent Detection

Test various phrasings:

- [ ] "search for X" → Detected as search
- [ ] "find X" → Detected as search
- [ ] "show me X" → Detected as search
- [ ] "what is X" → Detected as search
- [ ] "tell me about X" → Detected as search
- [ ] Just saying "mushrooms" → Detected as search (heuristic)

**Expected**: Various search phrasings all trigger search navigation

### Non-Search Commands

- [ ] "hello MYCA" → Should NOT navigate to search
- [ ] "what's the weather" → Should NOT navigate to search (conversation)
- [ ] "go to devices" → Should navigate to /devices (not search)
- [ ] "dark mode" → Should toggle theme (not search)

**Expected**: Non-search commands handled appropriately, not all voice input triggers search

---

## Test 5: Mobile Responsiveness

### Touch Interaction

- [ ] Tap voice button → Starts listening (no double-tap needed)
- [ ] Button size is at least 48x48px (comfortable for finger)
- [ ] Button has adequate spacing (not too close to edges)
- [ ] Tap area extends slightly beyond visual button

**Expected**: Touch-friendly, no accidental taps

### Voice Overlay

- [ ] Click voice button on mobile
- [ ] Overlay should go full-screen
- [ ] Large mic icon in center
- [ ] Transcript text is large and readable (18px+)
- [ ] Controls are touch-friendly
- [ ] Close button is large and accessible

**Expected**: Mobile-optimized overlay, large touch targets

### Landscape Mode

- [ ] Rotate device to landscape
- [ ] Voice button repositions (still accessible)
- [ ] Overlay still works in landscape
- [ ] Transcript still readable

**Expected**: Works in both portrait and landscape

---

## Test 6: Real Device Testing

### iOS (iPhone 13, Safari)

- [ ] Voice button visible
- [ ] Mic permissions prompt appears
- [ ] Voice input works (Web Speech API)
- [ ] Search navigation works
- [ ] Audio feedback (MYCA speaking) works
- [ ] No console errors

**Expected**: Full functionality on iOS Safari

### Android (Pixel 7, Chrome)

- [ ] Voice button visible
- [ ] Mic permissions prompt appears
- [ ] Voice input works (Web Speech API)
- [ ] Search navigation works
- [ ] Audio feedback works
- [ ] No console errors

**Expected**: Full functionality on Android Chrome

### iOS (iPad, Safari)

- [ ] Voice button visible and sized appropriately
- [ ] Voice input works
- [ ] Search works
- [ ] Portrait and landscape modes work

**Expected**: Works on tablets

---

## Test 7: Error Handling

### No Microphone

- [ ] Test on device with no mic (desktop with mic disabled)
- [ ] Click voice button
- [ ] Should show error message or gracefully fail
- [ ] Should still allow text search

**Expected**: Graceful error message, doesn't break app

### PersonaPlex Offline

- [ ] Stop PersonaPlex Bridge (if running locally)
- [ ] Load website
- [ ] Voice button should show disconnected state
- [ ] Click button → Should show "unavailable" message OR fallback to Web Speech API
- [ ] Console logs fallback activation

**Expected**: Graceful fallback when PersonaPlex unavailable

### Network Disconnection

- [ ] Start voice session
- [ ] Disconnect internet mid-speech
- [ ] Should show connection error
- [ ] Retry button should appear

**Expected**: Handles network failures gracefully

### Unsupported Browser

- [ ] Test on old browser (e.g., IE11 emulation)
- [ ] Voice button may not appear OR
- [ ] Shows "unsupported" message

**Expected**: Graceful degradation for unsupported browsers

---

## Test 8: Performance

### Load Time

- [ ] Open DevTools → Network tab
- [ ] Navigate to homepage
- [ ] Voice button should appear within 3 seconds
- [ ] Voice button load doesn't block page rendering

**Expected**: Fast load, non-blocking

### Voice Latency

- [ ] Click voice button
- [ ] Speak: "search for fungi"
- [ ] Measure time from end of speech to search navigation
- [ ] Should be < 3 seconds total

**Expected**: Low latency (< 3s from speech end to search)

### Memory Usage

- [ ] Open DevTools → Performance Monitor
- [ ] Use voice feature multiple times
- [ ] Check memory usage (should not increase significantly)
- [ ] No memory leaks

**Expected**: Stable memory usage

---

## Test 9: Accessibility

### Keyboard Navigation

- [ ] Tab through page
- [ ] Voice button should be reachable via Tab
- [ ] Press Enter on focused button → Starts listening
- [ ] Press Escape → Stops listening / closes overlay

**Expected**: Fully keyboard accessible

### Screen Reader

- [ ] Enable screen reader (NVDA/JAWS on Windows, VoiceOver on Mac)
- [ ] Tab to voice button
- [ ] Screen reader should announce "MYCA Voice Assistant, button"
- [ ] When active, should announce "Listening" or "Speaking"

**Expected**: Proper ARIA labels, screen reader compatible

### Color Contrast

- [ ] Voice button has sufficient contrast (4.5:1 minimum)
- [ ] Listening state (red) is distinguishable
- [ ] Status indicators have good contrast

**Expected**: WCAG AA color contrast compliance

---

## Test 10: Integration with MYCA

### Consciousness Pipeline

- [ ] Say: "Are you alive MYCA?"
- [ ] MYCA should respond with voice (not just text)
- [ ] Response should come from MAS Orchestrator
- [ ] Check console for MAS event logs

**Expected**: Voice goes through PersonaPlex → MAS → MYCA consciousness

### Memory Retention

- [ ] Have a conversation with MYCA
- [ ] Say: "Remember my name is Morgan"
- [ ] Later say: "What's my name?"
- [ ] MYCA should recall "Morgan"

**Expected**: MYCA uses memory system correctly

### Tool Calls

- [ ] Ask MYCA: "What devices are online?"
- [ ] MYCA should query MycoBrain service
- [ ] Should respond with actual device data

**Expected**: MYCA can use tools via voice

---

## Test 11: Analytics & Monitoring

### Voice Search Analytics

- [ ] Perform several voice searches
- [ ] Check analytics dashboard (if implemented)
- [ ] Should track: query, timestamp, success/fail

**Expected**: Voice searches are logged

### Error Logging

- [ ] Trigger an error (e.g., disconnect PersonaPlex mid-session)
- [ ] Check admin dashboard or logs
- [ ] Error should be logged with stack trace

**Expected**: Errors are captured and logged

---

## Test Results Summary

**Total Tests**: ___ / 100+  
**Passed**: ___  
**Failed**: ___  
**Blocked**: ___  

### Critical Issues Found

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Minor Issues Found

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Notes

___________________________________________
___________________________________________
___________________________________________

---

## Sign-Off

**Tester Signature**: ___________  
**Date**: ___________  
**Status**: [ ] Approved for Production [ ] Needs Fixes [ ] Blocked

---

## Quick Test Commands

```bash
# Local dev - Start PersonaPlex
python scripts/start_myca_voice.py

# Check PersonaPlex health
curl http://localhost:8999/health

# Check Moshi health
curl http://localhost:8998/health

# Check MAS health
curl http://192.168.0.188:8001/health

# Start website dev server
npm run dev:next-only

# Run e2e tests
npx playwright test tests/e2e/voice-search.spec.ts

# Check console errors
# Open browser DevTools → Console → Look for errors (red text)

# Test mobile view
# DevTools → Device Toolbar → Choose device → Refresh
```
