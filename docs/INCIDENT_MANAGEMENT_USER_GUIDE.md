# Incident Management System - User Guide & Walkthrough

## Welcome to Mycosoft Security Operations Center

This guide will walk you through the Incident Management System, a blockchain-inspired security incident tracking platform with real-time monitoring, cryptographic integrity verification, and AI-powered cascade prediction.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Incident Chain Explorer](#incident-chain-explorer)
4. [Viewing Incident Details](#viewing-incident-details)
5. [Understanding Causality & Predictions](#understanding-causality--predictions)
6. [Agent Activity Monitoring](#agent-activity-monitoring)
7. [Different View Modes](#different-view-modes)
8. [Test Mode Features](#test-mode-features)
9. [Chain Integrity Verification](#chain-integrity-verification)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the System

1. Navigate to `http://your-domain/security/incidents`
2. Ensure you are logged in with appropriate security credentials
3. The dashboard will load with real-time data

### First-Time Setup

When you first access the system, you'll see the main incident dashboard. If no incidents exist yet, you can use **Test Mode** to generate sample data for learning purposes.

---

## Dashboard Overview

### Header Section

The header displays key information at a glance:

| Element | Description |
|---------|-------------|
| **LIVE** indicator | Green pulsing dot indicates real-time connection |
| **Chain Verified** | Shows chain integrity status and current block count |
| **Test Mode** buttons | Generate test incidents (+10, +50, Auto) |

### Statistics Bar

Six key metrics are displayed across the top:

1. **Open Incidents** 
   - Total number of unresolved incidents
   - Click the ℹ️ icon for detailed breakdown

2. **Critical**
   - Count of critical-severity incidents requiring immediate attention
   - Target response time: < 15 minutes

3. **High Priority**
   - Combined critical and high-severity incidents
   - Target response time: < 1 hour

4. **Active Agents**
   - Number of AI agents currently monitoring and responding
   - Includes: Prediction Agent, Resolution Agent, Watchdog Agent

5. **Chain Block**
   - Current block number in the cryptographic chain
   - Each incident event creates a new block

6. **Avg Resolution**
   - Average time to resolve incidents
   - Lower is better

---

## Incident Chain Explorer

### Understanding the Block Chain

The Incident Chain Explorer visualizes all security events as a cryptographic blockchain:

```
[Block #13] ← [Block #12] ← [Block #11] ← ... ← [Block #1] ← [Genesis]
```

Each block contains:
- **Sequence Number**: Unique block identifier
- **Hash**: First 6 characters of SHA-256 hash
- **Previous Hash**: Links to the previous block
- **Event Type**: What happened (created, resolved, etc.)
- **Reporter**: Who/what reported the event

### Color Coding

Blocks are color-coded by event type:
- 🔴 **Red/Orange** - Critical/High severity events
- 🟡 **Yellow** - Medium severity events
- 🟢 **Green** - Resolved or low severity
- 🔵 **Blue** - Status changes

### Clicking a Block

When you click a block, a detail panel appears showing:

1. **Block Information**
   - Full hash and previous hash
   - Timestamp and block number
   - Event type and reporter

2. **Incident Causality & Cascade Prediction**
   - Root causes (upstream incidents)
   - Current incident details
   - Cascading effects (downstream impacts)
   - AI-predicted potential cascades

---

## Viewing Incident Details

### Incident Stream (Split View / Incidents Tab)

The incident stream shows all incidents in chronological order. Each incident card displays:

- **Severity Badge**: Critical, High, Medium, Low
- **Title**: Brief description of the incident
- **Status**: Open, Investigating, Contained, Resolved
- **Timestamp**: When the incident was created
- **Source IP**: Origin of the incident (if applicable)

### Expanding an Incident

Click anywhere on an incident card to expand it and see:

```
┌─────────────────────────────────────────┐
│ 🔴 CRITICAL - Unauthorized Access       │
│    Status: Investigating                │
│    Created: 2 minutes ago               │
├─────────────────────────────────────────┤
│ ▼ Details                               │
│   ID: inc-1769303003910-meqqzj2l3       │
│   Category: Authentication              │
│   Source: 192.168.1.105                 │
│   Assigned To: Security Team            │
│   Description: Multiple failed login... │
└─────────────────────────────────────────┘
```

---

## Understanding Causality & Predictions

### Root Causes Section

Shows incidents that may have caused the current incident:

- **Primary Incident**: No upstream incidents detected (this is the root)
- **Caused By**: Links to parent incidents with confidence percentages

### This Incident Section

Current incident summary:
- Event type with severity badge
- Reporter type (User, Agent, System)
- Incident title and block number

### Cascading Effects Section

**Confirmed Cascades**: Actual incidents caused by this one
**Predicted Cascades**: AI-predicted potential future incidents

Each prediction shows:
- **Incident Type**: What might happen
- **Confidence**: Probability percentage
- **Risk Level**: High, Medium, Low
- **Recommended Action**: Steps to prevent

### How Predictions Work

The **CascadePredictionAgent** analyzes incident patterns:

1. **Pattern Matching**: Compares to historical incidents
2. **Severity Analysis**: Higher severity = more cascade potential
3. **Category Correlation**: Related categories often cascade
4. **Time-Based Risk**: Recent incidents have higher impact

---

## Agent Activity Monitoring

### Agents Tab

View all AI agent activity in real-time:

| Agent | Role |
|-------|------|
| **CascadePredictionAgent** | Predicts potential incident cascades |
| **IncidentResolutionAgent** | Auto-resolves eligible incidents |
| **WatchdogAgent** | Monitors system health |
| **Guardian** | Enforces security policies |
| **Hunter** | Proactively searches for threats |

### Activity Types

- 🔍 **detected** - New threat detected
- ⚠️ **reported** - Incident reported to chain
- 🔄 **investigating** - Analysis in progress
- 🛡️ **contained** - Threat contained
- ✅ **resolved** - Issue resolved
- 🚫 **prevented_cascade** - Predicted cascade prevented
- 📊 **resolution_progress** - Shows progress bar

### Resolution Progress

When an agent is resolving an incident, you'll see:
```
[====================----] 75%
Status: Analyzing...
```

Progress stages:
1. Investigating (0-25%)
2. Analyzed (25-50%)
3. Contained (50-75%)
4. Fixed (75-90%)
5. Resolved (90-100%)

---

## Different View Modes

### Mempool View

Bitcoin-inspired visualization:
- **Pending Pool**: Incidents awaiting resolution
- **Resolved Pool**: Completed incidents
- **Block sizes** represent severity
- **Colors** indicate priority

### Split View

Side-by-side layout:
- **Left**: Live Incident Stream
- **Right**: Agent Activity Stream

### Incidents View

Full-width incident list with:
- Filtering options
- Search capability
- Bulk actions

### Agents View

Dedicated agent monitoring:
- Agent status
- Run statistics
- Error logs

### Timeline View

Chronological event timeline:
- Scrollable history
- Download individual block details
- Visual time indicators

---

## Test Mode Features

### Generating Test Incidents

For training or demonstration purposes:

1. **+10 Button**: Create 10 random incidents
2. **+50 Button**: Create 50 random incidents
3. **Auto (10s)**: Continuously generate every 10 seconds

### What Test Mode Creates

Each test batch generates:
- Various severity levels (Critical, High, Medium, Low)
- Different incident categories
- Agent activities
- Resolution progress
- Causality links (40% of incidents)
- Cascade predictions

### Stopping Auto-Generation

Click the **Auto** button again to stop continuous generation.

---

## Chain Integrity Verification

### Understanding Chain Status

The chain badge shows:
- ✅ **Chain Verified** (Green) - All blocks valid
- ⚠️ **Chain Warning** (Yellow) - Minor issues
- ❌ **Chain Invalid** (Red) - Integrity compromised

### What Makes a Valid Chain

1. **Sequence Numbers**: Must be consecutive
2. **Previous Hash**: Must match prior block's hash
3. **Event Hash**: Must match recalculated hash
4. **No Gaps**: All blocks present

### Checking Chain Health

Navigate to `/api/security/chain-repair` for detailed verification:

```json
{
  "entriesTotal": 13,
  "valid": true,
  "issuesFound": 0,
  "firstEntry": { "sequence": 1, "hash": "..." },
  "lastEntry": { "sequence": 13, "hash": "..." }
}
```

---

## Troubleshooting

### No Incidents Showing

1. Check your network connection
2. Verify the LIVE indicator is green
3. Use Test Mode to generate sample data
4. Check browser console for errors

### Chain Shows Invalid

1. Navigate to `/api/security/chain-repair`
2. Check the issues array for specific problems
3. Contact system administrator for repair

### Agent Activity Empty

1. Ensure agents are initialized
2. Check `/api/security/agents` for agent status
3. Generate test incidents to trigger agent activity

### Slow Performance

1. Reduce refresh rate (currently 5 seconds)
2. Close unused browser tabs
3. Check server resources

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Mempool view |
| `2` | Switch to Split View |
| `3` | Switch to Incidents view |
| `4` | Switch to Agents view |
| `5` | Switch to Timeline view |
| `Esc` | Close block detail panel |

---

## Glossary

| Term | Definition |
|------|------------|
| **Block** | A cryptographically signed incident event |
| **Chain** | Linked series of blocks forming immutable log |
| **Hash** | SHA-256 fingerprint of block data |
| **Merkle Root** | Hash of all block hashes for verification |
| **Cascade** | Chain reaction of incidents |
| **Genesis** | First block in the chain (all zeros hash) |

---

## Getting Help

- **Documentation**: `/docs/INCIDENT_CAUSALITY_SYSTEM.md`
- **API Reference**: `/api/security/incidents` (GET for usage info)
- **System Tests**: `/api/security/tests`
- **Support**: Contact the Mycosoft Security Team

---

## System Verification Report

The following features have been tested and verified as of January 25, 2026:

### ✅ Core Dashboard Features
- **LIVE indicator**: Green pulsing dot confirming real-time SSE connection
- **Chain Verified badge**: Shows "#26 • 26 blocks" with verified status
- **Statistics Bar**: All six metrics populating with real data
  - Open Incidents: 18
  - Critical: 2
  - High Priority: 14
  - Active Agents: 8
  - Chain Block: #26
  - Avg Resolution: 615m

### ✅ Incident Chain Explorer (Mempool View)
- Block chain visualization with 26+ blocks displayed
- Color-coded blocks by severity (red/orange for critical/high, yellow for medium, green for low/resolved)
- Block detail panel opens on click with:
  - Full SHA-256 hash and previous hash
  - Event type, timestamp, reporter
  - Incident ID and block number
  - Download Block button

### ✅ Causality & Cascade Prediction
- **Root Causes**: Shows "Primary Incident" or upstream links
- **This Incident**: Displays event type badge and reporter
- **Cascading Effects**: 
  - Confirmed cascades with relationship data
  - Predicted cascades with confidence percentages (e.g., "Massive Cloud Bill Increase - 72%")
  - Recommended actions for prevention

### ✅ Agent Activity Stream
- Multiple agents actively reporting:
  - Incident Response Agent (resolved, 100% complete)
  - Threat Hunter (detected)
  - Threat Watchdog (detected)
  - Endpoint Protection Agent (detected)
  - Network Sentinel, Behavior Detector, File Integrity Monitor, etc.
- Expandable activity cards showing:
  - Resolution progress bar (0-100%)
  - Resolution stages: Investigating → Analyzed → Contained → Fixed → Resolved
  - Full action data in JSON format
  - Copy Hash and Export JSON buttons

### ✅ Incident Stream (Split View)
- Real-time incident list with severity badges
- Status indicators: Open, Investigating, Contained, Resolved
- Expandable incident cards (click anywhere, not just arrow)
- Search and filter functionality
- Block number and hash for chain linkage

### ✅ Timeline View
- Chronological chain blocks with SHA-256 hashes
- Previous hash links showing chain integrity
- Event type and reporter for each block
- Expandable details with Download Block button
- Clear explanation of cryptographic proof concept

### ✅ Test Mode
- +10 and +50 buttons generate test incidents
- Auto (10s) mode for continuous generation
- Generated incidents include:
  - Various severities and categories
  - Agent activity simulation
  - Causality links between incidents
  - Cascade predictions

### ✅ Cryptographic Integrity
- SHA-256 hashing for all blocks
- Chain linking via previous_hash
- Atomic database operations (PostgreSQL RPC function)
- Chain verification at /api/security/chain-repair

### ⚠️ Known Limitations
- Predictions are simulated based on incident patterns (not live ML model)
- Some UI elements may need additional polish
- Agent auto-resolution is periodic (not real-time)

---

*Last Updated: January 25, 2026*
*Version: 1.0.0*
