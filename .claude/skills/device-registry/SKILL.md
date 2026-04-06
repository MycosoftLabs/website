---
description: Navigate the Device Registry at mycosoft.com to register new devices, view registered devices, and manage device metadata — online/offline status, uptime, last seen.
---

# Device Registry

## Identity
- **Category**: devices
- **Access Tier**: COMPANY-only
- **Depends On**: platform-authentication, platform-navigation
- **Route**: /natureos/devices/registry
- **Key Components**: Device list table, registration form, device metadata panels

## Success Criteria (Eval)
- [ ] Device Registry page loads at /natureos/devices/registry
- [ ] Registered devices list displays with columns: name, status, uptime, last seen
- [ ] Online/offline status indicators are visible and accurate
- [ ] New device registration form is accessible and submittable
- [ ] Device metadata can be viewed and edited

## Navigation Path (Computer Use)
1. Log in with COMPANY-tier credentials
2. Navigate to NatureOS section
3. Click "Devices" in the sidebar, then "Registry" — or go directly to /natureos/devices/registry
4. Wait for device list to load

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| "Device Registry" heading | Top of main content | Confirms correct page |
| Device list table | Center — rows of registered devices | Scan for target device; check status column |
| Online/Offline status badges | In each device row — green/red indicators | Green = online, Red = offline |
| Uptime column | In device table | Shows how long device has been running |
| Last Seen column | In device table | Shows timestamp of last communication |
| "Register Device" button | Top-right or above the table | Click to open registration form |
| Device detail panel | Slides out or opens on row click | View/edit device metadata |

## Core Actions
### Action 1: View Registered Devices
**Goal:** See all devices and their current status
1. Navigate to /natureos/devices/registry
2. Wait for the device list table to populate
3. Review status column for online/offline indicators
4. Check uptime and last seen timestamps

### Action 2: Register a New Device
**Goal:** Add a new device to the registry
1. Click the "Register Device" button
2. Fill in device name, type, and location fields
3. Enter device serial number or identifier
4. Submit the registration form
5. Verify the new device appears in the device list

### Action 3: Manage Device Metadata
**Goal:** Update information for an existing device
1. Click on a device row in the list to open its detail panel
2. Review current metadata (name, location, tags, configuration)
3. Edit fields as needed
4. Save changes
5. Verify updates reflected in the device list

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Empty device list | No devices registered yet or API timeout | Check network; try refreshing the page |
| All devices show "Offline" | Backend service or WebSocket disconnected | Check service health; verify backend connectivity |
| Registration form validation error | Required fields missing or invalid format | Fill all required fields; check serial number format |
| Access denied | Not authenticated at COMPANY tier | Re-login with COMPANY-level credentials |
| "Device already registered" error | Duplicate serial number | Check existing registry for the device; use edit instead |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation
- **Next skills**: device-telemetry, device-fleet, device-mycobrain-setup

## Computer Use Notes
- Device list may take a moment to load if there are many registered devices
- Online/offline status badges are small colored circles — green for online, red for offline
- Clicking a table row typically opens a detail panel on the right side
- The "Register Device" button may be styled as a primary action button (blue/green)
- Sort columns by clicking column headers

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
