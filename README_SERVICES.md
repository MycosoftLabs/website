# Automatic Service Management

**Status:** ✅ All services now automatically start and stay online

## Quick Start

### Start All Services Automatically

**Windows:**
```bash
# Option 1: Use the batch script
scripts\start_services.bat

# Option 2: Use PowerShell
scripts\start_services.ps1

# Option 3: Use npm
npm run services:start

# Option 4: Direct Python
python services\service_manager.py
```

The service manager will:
- ✅ Start all services automatically
- ✅ Monitor service health every 10 seconds
- ✅ Auto-restart failed services
- ✅ Log all service events

## Services Managed

### MycoBrain Service
- **Port:** 8765
- **Health:** `http://localhost:8765/health`
- **Auto-start:** ✅ Enabled
- **Auto-restart:** ✅ Enabled

## How It Works

1. **Service Manager** (`services/service_manager.py`)
   - Starts all services on launch
   - Monitors health continuously
   - Auto-restarts on failure
   - Enforces restart limits

2. **MYCA Agent** (`mycosoft_mas/agents/system/service_monitor_agent.py`)
   - Monitors services via MAS
   - Reports to MYCA orchestrator
   - Provides service status API

3. **Status API** (`/api/services/status`)
   - Real-time service status
   - Used by Device Manager
   - Health check endpoint

## Integration

The Device Manager now:
- ✅ Automatically detects when services come online
- ✅ Shows service status in real-time
- ✅ No manual service startup needed

## Troubleshooting

If a service doesn't start:
1. Check service manager logs
2. Verify Python and dependencies are installed
3. Check if port is already in use
4. Review service configuration

## Files

- `services/service_manager.py` - Main service manager
- `mycosoft_mas/agents/system/service_monitor_agent.py` - MYCA agent
- `app/api/services/status/route.ts` - Status API
- `scripts/start_services.bat` - Windows startup script
- `scripts/start_services.ps1` - PowerShell startup script



































