# USB Dock Troubleshooting - January 15, 2026

**Date**: 2026-01-15  
**Status**: Resolved  
**Hardware**: CalDigit TS4 Thunderbolt Dock

---

## Summary

This document describes USB dock connectivity issues that occurred overnight and the troubleshooting steps taken. This is **separate** from the MycoBrain software fixes documented in `MYCOBRAIN_FIXES_2026-01-15.md`.

---

## Initial Symptoms

On waking, the following issues were observed:
1. PC had restarted unexpectedly
2. CalDigit TS4 dock power light cycling on/off every ~10 seconds
3. All dock peripherals not enumerating (keyboard, microphone, MycoBrain board)
4. MycoBrain startup jingle heard periodically (board was resetting with dock)
5. Startup services not running (Docker Desktop, always-on containers)

---

## Root Cause Analysis

### Windows Event Log Findings

1. **Windows Update Reboot**: The PC restarted due to a scheduled Windows Update, not a crash
2. **USB xHCI Events**: Warning 400 events for USB device enumeration failures
3. **Kernel-PnP Events**: "Unknown USB Device (Device Descriptor Request Failed)" on Genesys hub (VID_05E3)

### Hardware Investigation

**Tested Components**:
- Original Thunderbolt cable (TB5 16K 240W, ~3-4 feet)
- Replacement Anker Thunderbolt 4 cable (~2 feet, 100W)
- Different Thunderbolt 4 ports on PC
- Direct USB connections to PC (bypassing dock)

**Findings**:
1. **Original Cable**: Caused dock to power cycle continuously when connected
2. **Anker Cable**: Dock immediately stabilized, all peripherals enumerated
3. Switching back to original cable reproduced the power cycling issue
4. Original cable worked previously but has become marginal/faulty

### Conclusion

The original Thunderbolt cable failed (likely due to cable degradation or marginal quality). Thunderbolt 4/USB4 link negotiation is sensitive to cable quality. The Windows Update reboot was coincidental timing - the cable may have been intermittently failing before.

---

## Resolution

**Immediate Fix**: Replaced Thunderbolt cable with Anker Thunderbolt 4 cable.

**Peripherals Restored**:
- ✅ Keyboard working
- ✅ Microphone working (audio input recognized)
- ✅ MycoBrain on COM7 (later mapped to /dev/ttyACM0 in Docker)

---

## Cable Specifications Discussion

User inquired about cable options:

| Cable | Length | Power | Suitability |
|-------|--------|-------|-------------|
| Anker TB4 (current) | ~2 ft | 100W | ✅ Working, but short |
| Anker TB4 option | 6.6 ft | 100W | Likely fine for peripherals |
| 240W cables | 2.3 ft | 240W | Too short for desk setup |

**Technical Notes**:
- The TS4 dock itself provides power to peripherals; the upstream cable's power rating mainly matters for laptop charging
- 100W vs 240W difference won't affect dock functionality or peripheral performance
- Longer cables at 100W are acceptable; Thunderbolt 4 spec ensures 40Gbps at certified cable lengths
- Quality and certification matter more than wattage for dock stability

---

## Service Restoration

After hardware fix, the following services needed to be restarted:

1. **Docker Desktop** - Started automatically after login
2. **Always-On Docker Stack** - Started via `scripts\start-all-persistent.ps1`
3. **USB Device Attachment** - `scripts\attach-mycoboard-usbipd.ps1` to bind MycoBrain to WSL2

### Commands Used
```powershell
# Start all services
.\scripts\start-all-persistent.ps1

# Manually attach USB device to WSL2 (if needed)
.\scripts\attach-mycoboard-usbipd.ps1
```

---

## Related Issues

The dock failure led to discovery of software issues in the MycoBrain integration which are documented separately in `MYCOBRAIN_FIXES_2026-01-15.md`.

---

## Recommendations

1. **Keep spare Thunderbolt cable** - TB4 cables can fail without warning
2. **Use certified cables** - Look for Intel/USB-IF certification marks
3. **Cable length** - Up to 2m (6.6 ft) should work reliably for TB4
4. **Power rating** - 100W is sufficient for dock + peripherals; 240W only needed if charging high-powered laptop

---

*Document created: 2026-01-15*
