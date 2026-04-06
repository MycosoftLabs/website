---
description: Navigate Smell Training at mycosoft.com to train BME688 gas sensors for VOC signature recognition — olfactory signal processing for fungal species identification.
---

# Smell Training

## Identity
- **Category**: devices
- **Access Tier**: SUPER_ADMIN only
- **Depends On**: platform-authentication, platform-navigation, device-mycobrain-setup
- **Route**: /natureos/smell-training
- **Key Components**: BME688 gas sensor training interface, VOC signature library, species identification models

## Success Criteria (Eval)
- [ ] Smell Training page loads at /natureos/smell-training
- [ ] BME688 gas sensor connection confirmed
- [ ] Training session can be initiated with a target VOC signature
- [ ] Sensor data captured and labeled during training
- [ ] VOC signature saved to the signature library
- [ ] Species identification inference runs against trained signatures

## Navigation Path (Computer Use)
1. Log in with SUPER_ADMIN credentials (highest tier required)
2. Navigate to NatureOS section
3. Click "Smell Training" or go directly to /natureos/smell-training
4. Verify BME688 sensor connection status before starting

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| "Smell Training" heading | Top of main content | Confirms correct page |
| Sensor Connection Status | Upper area — "BME688 Connected"/"Disconnected" | Must show connected before training |
| Gas Resistance Live Reading | Real-time display of current sensor values | Monitor during training sessions |
| Training Session Controls | Center — Start/Stop/Pause buttons | Control active training sessions |
| VOC Signature Label Input | Form field near training controls | Enter the name/species for this scent signature |
| Signature Library | Below or sidebar — list of saved signatures | Browse previously trained VOC profiles |
| Training Progress Indicator | During active session — progress bar or timer | Shows collection progress |
| Species Match Results | After inference — ranked list of matches | Review identification confidence scores |

## Core Actions
### Action 1: Start a Training Session
**Goal:** Capture a new VOC signature from a known sample
1. Verify BME688 sensor shows "Connected"
2. Place the target sample near the sensor
3. Enter the signature label (e.g., species name, compound name)
4. Click "Start Training" button
5. Wait for the collection period (typically 30-120 seconds)
6. Review captured data quality
7. Click "Save Signature" to store the VOC profile

### Action 2: Browse Signature Library
**Goal:** View and manage previously trained VOC signatures
1. Navigate to the Signature Library section
2. Browse saved signatures by name or date
3. Click a signature to view its gas resistance profile
4. Compare signatures side-by-side if available
5. Delete or re-train signatures as needed

### Action 3: Run Species Identification
**Goal:** Identify an unknown sample using trained signatures
1. Ensure BME688 sensor is connected and reading
2. Place the unknown sample near the sensor
3. Click "Identify" or "Match" button
4. Wait for the inference to complete
5. Review ranked results with confidence scores
6. The top match indicates the most likely species/compound

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "BME688 Disconnected" | Sensor not connected or MycoBrain offline | Check USB connection; verify device in device-registry |
| Access denied / 403 | Not SUPER_ADMIN tier — this is the highest access level | Contact system administrator for SUPER_ADMIN access |
| Training session yields flat data | Sensor not warmed up or sample too far away | Wait 10 minutes for sensor warmup; place sample closer |
| Low confidence on all matches | Signature library too small or novel compound | Train more signatures; the compound may be unknown |
| "Signature already exists" | Duplicate label name | Use a unique name or version the signature |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation, device-mycobrain-setup
- **Next skills**: device-telemetry, defense-fusarium, science-species-explorer

## Computer Use Notes
- SUPER_ADMIN is the highest access tier — most users will not have access to this page
- BME688 gas resistance readings are in ohms and can vary from thousands to millions
- Training sessions require the physical MycoBrain device to be present and connected
- VOC signatures are unique gas resistance profiles over time — think of them as "smell fingerprints"
- The sensor needs 5-10 minutes of warmup time for accurate readings
- Place samples 1-3 cm from the BME688 sensor for best results

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
