# MycoBrain Changelog

All notable changes to MycoBrain integration in the Mycosoft Website.

## [2026-01-15] - Device Manager API Fixes

### Fixed
- **API Routes**: Changed `/cli` endpoint calls to `/command` - the MycoBrain service does not have a `/cli` endpoint
- **Device ID Resolution**: Added `resolveDeviceId()` helper to all `[port]` routes to properly convert Linux paths (`/dev/ttyACM0`) to device IDs (`mycobrain--dev-ttyACM0`)
- **Machine Mode**: Updated firmware commands to only use supported commands (`fmt json`) - removed unsupported `mode machine` and `dbg off`
- **Console Logging**: Fixed "buzzer preset" logging to properly show command execution

### Added
- **Auto Machine Mode**: Device manager now automatically initializes machine mode when a device connects
- **Machine Mode Status**: Added visual indicator showing when NDJSON Machine Mode Protocol is active

### Changed
- **Sensors Route**: Updated to use proper command format `{ cmd: "get-sensors" }` instead of plain text

### Files Modified
- `app/api/mycobrain/[port]/sensors/route.ts`
- `app/api/mycobrain/[port]/machine-mode/route.ts`
- `components/mycobrain/mycobrain-device-manager.tsx`

### Technical Notes
- MycoBrain service runs at `:8003` in Docker container
- Firmware v2.0.0 commands: `help, status, ping, get_mac, get_version, scan, sensors, led, beep, fmt, optx, aotx, reboot`
- Device ID format: `mycobrain-{port}` where slashes are replaced with hyphens

---

## Previous Changes

*No previous changelog entries for MycoBrain integration*
