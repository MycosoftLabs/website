# Service Management System

**Date:** 2025-12-28  
**Status:** ✅ Automatic service management implemented

## Overview

All Mycosoft services now automatically start, monitor, and maintain themselves. The system includes:

1. **Service Manager** - Python-based service lifecycle management
2. **MYCA Service Monitor Agent** - AI agent that monitors and maintains services
3. **Auto-restart** - Services automatically restart on failure
4. **Health checks** - Continuous monitoring of service health

## Services Managed

### MycoBrain Service
- **Port:** 8765
- **Health Check:** `http://localhost:8765/health`
- **Auto-start:** ✅ Enabled
- **Auto-restart:** ✅ Enabled (max 10 restarts per 5 minutes)

## How It Works

### 1. Service Manager (`services/service_manager.py`)

Automatically:
- Starts all registered services on system startup
- Monitors service health every 10 seconds
- Restarts failed services automatically
- Enforces restart limits to prevent restart loops
- Logs all service events

**Usage:**
```bash
# Start service manager
python services/service_manager.py

# Or use npm script
npm run services:start
```

### 2. MYCA Service Monitor Agent

The MYCA agent:
- Monitors all services continuously
- Reports service status to MYCA
- Automatically restarts failed services
- Provides service status via API
- Integrates with MAS orchestrator

**Location:** `mycosoft_mas/agents/system/service_monitor_agent.py`

### 3. Service Status API

**Endpoint:** `GET /api/services/status`

Returns status of all services:
```json
{
  "services": [
    {
      "id": "mycobrain",
      "name": "MycoBrain Service",
      "status": "online",
      "statusCode": 200
    }
  ],
  "timestamp": "2025-12-28T..."
}
```

## Startup Methods

### Method 1: Service Manager (Recommended)
```bash
# Windows
python services\service_manager.py

# Or use script
scripts\start_services.bat
```

### Method 2: npm Script
```bash
npm run services:start
```

### Method 3: Manual Start
```bash
# Individual service
npm run services:mycobrain
```

## Integration with Website

The Device Manager now:
- Automatically checks service status
- Uses `/api/services/status` endpoint
- Shows service health in real-time
- Auto-detects when services come online

## Adding New Services

To add a new service, edit `services/service_manager.py`:

```python
service_manager.register_service(ServiceConfig(
    name="my_service",
    command=["python", "my_service.py"],
    port=8080,
    health_check_url="http://localhost:8080/health",
    restart_delay=5,
    max_restarts=10
))
```

## Monitoring

### Service Manager Logs
- All service events are logged
- Check console output for service status
- Errors are logged with details

### MYCA Agent
- Monitors services every 30 seconds
- Reports to MYCA orchestrator
- Can be queried via agent API

### Health Checks
- Each service has a health endpoint
- Health checks run every 10 seconds
- Failed health checks trigger restart

## Troubleshooting

### Service Not Starting
1. Check service manager logs
2. Verify service command is correct
3. Check if port is already in use
4. Verify working directory exists

### Service Restarting Continuously
1. Check service logs for errors
2. Verify service dependencies
3. Check restart limits (max 10 per 5 minutes)
4. Review service configuration

### Service Not Detected
1. Verify health check URL is correct
2. Check if service is listening on expected port
3. Verify service process name matches

## Future Enhancements

- [ ] Docker container support
- [ ] Windows Service integration
- [ ] Systemd integration (Linux)
- [ ] Service dependency management
- [ ] Service metrics dashboard
- [ ] Alert notifications

## Files

- `services/service_manager.py` - Main service manager
- `mycosoft_mas/agents/system/service_monitor_agent.py` - MYCA agent
- `app/api/services/status/route.ts` - Status API
- `scripts/start_services.ps1` - PowerShell startup script
- `scripts/start_services.bat` - Batch startup script



































