# n8n Workflow Automation Integration Guide

**Last Updated:** 2026-01-16
**Status:** ✅ OPERATIONAL

## Overview

n8n is the workflow automation engine that powers the NatureOS system. It runs 43+ critical workflows that handle:

- **Myca AI Assistant** - Voice commands, speech processing, agent routing
- **MyCoBrain Telemetry** - Device data forwarding, optical/acoustic modem integration
- **MINDEX Data Pipeline** - Species scraping, image collection, data sync
- **Space Weather & Environmental** - Real-time environmental data collection
- **Defense Connector** - Security and monitoring workflows
- **System Operations** - Proxmox, UniFi, NAS health, GPU jobs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MYCOSOFT INFRASTRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────────────┐   │
│  │  ALWAYS-ON STACK    │      │      MAS STACK              │   │
│  │  (mycosoft-always-on)│     │  (mycosoft-mas_mas-network) │   │
│  ├─────────────────────┤      ├─────────────────────────────┤   │
│  │ • Website (3000)    │◄────►│ • n8n (5678)                │   │
│  │ • MINDEX API (8000) │      │ • Redis (6379)              │   │
│  │ • MycoBrain (8003)  │      │ • MAS Orchestrator (8001)   │   │
│  │ • PostgreSQL        │      │ • Ollama (11434)            │   │
│  └─────────────────────┘      │ • Whisper (8765)            │   │
│           │                   │ • TTS Services              │   │
│           │                   │ • Grafana (3002)            │   │
│           └───────────────────┤ • Prometheus (9090)         │   │
│                   SHARED      │ • Qdrant (6345)             │   │
│                   NETWORK     └─────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Network Configuration

### Shared Networks

The `docker-compose.always-on.yml` connects services to both networks:

```yaml
networks:
  mycosoft-always-on:
    external: true
    name: mycosoft-always-on
  mycosoft-mas_mas-network:
    external: true
    name: mycosoft-mas_mas-network
```

### Environment Variables

The website container uses direct container names for communication:

```yaml
# n8n - Direct container access via MAS network
N8N_LOCAL_URL: http://mycosoft-mas-n8n-1:5678
N8N_WEBHOOK_URL: http://mycosoft-mas-n8n-1:5678

# Redis - Direct container access for event bus
REDIS_URL: redis://mycosoft-mas-redis-1:6379
```

## Workflows Inventory

### Core Myca Workflows (8)
| File | Description |
|------|-------------|
| `myca-master-brain.json` | Main AI orchestration |
| `myca-jarvis-unified.json` | Unified voice assistant |
| `myca-agent-router.json` | Route commands to agents |
| `myca-business-ops.json` | Business operations |
| `myca-system-control.json` | System administration |
| `myca-tools-hub.json` | Tool integration hub |
| `myca-proactive-monitor.json` | Proactive monitoring |
| `myca-speech-complete.json` | Speech processing |

### Data Collection Workflows (6)
| File | Description |
|------|-------------|
| `11_mindex_species_scraper.json` | Scrape species data |
| `12_mindex_image_scraper.json` | Collect species images |
| `11_native_space_weather.json` | Space weather data |
| `12_native_environmental.json` | Environmental sensors |
| `15_native_earth_science.json` | Earth science data |
| `16_native_analytics.json` | Analytics pipeline |

### MycoBrain Integration (2)
| File | Description |
|------|-------------|
| `13_mycobrain_telemetry_forwarder.json` | Forward sensor telemetry |
| `14_mycobrain_optical_acoustic_modem.json` | Optical/acoustic modem |

### Operations Workflows (5)
| File | Description |
|------|-------------|
| `20_ops_proxmox.json` | Proxmox VM management |
| `21_ops_unifi.json` | UniFi network control |
| `22_ops_nas_health.json` | NAS health monitoring |
| `23_ops_gpu_job.json` | GPU job scheduling |
| `24_ops_uart_ingest.json` | UART data ingestion |

### Speech & Voice (5)
| File | Description |
|------|-------------|
| `speech-interface-complete.json` | Full speech interface |
| `speech-interface-v2.json` | Updated speech interface |
| `speech-text-to-speech.json` | TTS processing |
| `speech-transcribe-only.json` | Transcription only |
| `voice-chat-workflow.json` | Voice chat handler |

### Integration & Routing (8)
| File | Description |
|------|-------------|
| `01_myca_command_api.json` | Command API endpoint |
| `01b_myca_event_intake.json` | Event intake handler |
| `02_router_integration_dispatch.json` | Integration dispatch |
| `03_native_ai.json` | Native AI functions |
| `04_native_comms.json` | Communications |
| `05_native_devtools.json` | Developer tools |
| `06_native_data_storage.json` | Data storage ops |
| `30_defense_connector.json` | Defense integration |

## Startup Procedure

### 1. Start MAS Stack First (contains n8n)

```bash
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
docker-compose up -d
```

### 2. Start Always-On Stack

```bash
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
docker-compose -f docker-compose.always-on.yml up -d
```

### 3. Verify n8n Connection

```bash
# Check n8n is running
curl http://localhost:5678/healthz

# Check website can reach n8n
curl http://localhost:3000/api/natureos/n8n
```

## Troubleshooting

### n8n Not Connected

1. **Check if MAS stack is running:**
   ```bash
   docker ps | findstr n8n
   ```

2. **Verify network connectivity:**
   ```bash
   docker network inspect mycosoft-mas_mas-network
   ```

3. **Reconnect containers to network manually:**
   ```bash
   docker network connect mycosoft-always-on mycosoft-mas-n8n-1
   docker network connect mycosoft-always-on mycosoft-mas-redis-1
   ```

4. **Recreate website container:**
   ```bash
   docker-compose -f docker-compose.always-on.yml up -d mycosoft-website --force-recreate
   ```

### Workflow Import Failed

1. **Check n8n-importer logs:**
   ```bash
   docker logs mycosoft-mas-n8n-importer-1
   ```

2. **Manually import workflows:**
   ```bash
   docker exec -it mycosoft-mas-n8n-1 n8n import:workflow --separate --input=/import/workflows
   ```

### API Returns "auth_required"

n8n requires authentication to list workflows via API. This is normal behavior. The workflows are still running.

To access workflows:
1. Open http://localhost:5678 in browser
2. Log in with your n8n credentials
3. View and manage workflows

## API Endpoints

### Check n8n Status
```
GET /api/natureos/n8n
```

Response:
```json
{
  "local": {
    "connected": true,
    "url": "http://mycosoft-mas-n8n-1:5678",
    "workflows": [...],
    "activeWorkflows": 1,
    "totalWorkflows": 1
  },
  "cloud": {
    "connected": false,
    "url": "https://mycosoft.app.n8n.cloud"
  }
}
```

### Trigger Workflows via Webhooks

n8n workflows can be triggered via webhooks:

```
POST http://localhost:5678/webhook/myca/jarvis
POST http://localhost:5678/webhook/myca/speech
POST http://localhost:5678/webhook/myca/speech/tts
```

## Critical Notes

⚠️ **n8n must be running 24/7** - These workflows are vital to the entire system.

⚠️ **MAS stack must start before Always-On stack** - n8n is in the MAS stack.

⚠️ **Do not stop n8n without stopping all dependent services first**.

## Related Documentation

- `docs/COMPLETE_IMPLEMENTATION_SESSION_JAN16_2026.md` - Full implementation details
- `docs/MQTT_DOCKER_SETUP.md` - MQTT broker setup
- `n8n/workflows/` - All workflow JSON files
- `n8n/scripts/normalize-workflows.mjs` - Workflow import script
