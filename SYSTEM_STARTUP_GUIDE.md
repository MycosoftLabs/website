# Mycosoft System Startup Guide

This guide explains how to start the entire Mycosoft system independently of Cursor.

## Quick Start

### Option 1: PowerShell Script (Recommended)
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\scripts
powershell -ExecutionPolicy Bypass -File start_all_services.ps1
```

### Option 2: Batch Script
```batch
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\scripts
start_all_services.bat
```

### Option 3: Manual Start

#### 1. Start Docker Containers
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
docker compose -f docker-compose.essential.yml up -d
```

#### 2. Start Next.js Website
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
npm run dev
```

#### 3. Start MycoBrain Service (Optional)
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
python services\mycobrain\mycobrain_service.py
```

#### 4. Start Service Manager (Optional)
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
python services\service_manager.py
```

## Check System Status

Run the status check script:
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\scripts
powershell -ExecutionPolicy Bypass -File check_status.ps1
```

## Access Points

Once started, access the system at:

- **Website**: http://localhost:3000
- **MAS API**: http://localhost:8001
- **N8N Workflows**: http://localhost:5678
- **MAS Dashboard**: http://localhost:3100
- **MyCA App**: http://localhost:3001
- **MINDEX API**: http://localhost:8000

## Docker Services

The following Docker containers are started:

- `mycosoft-postgres` - PostgreSQL database (Port 5433)
- `mycosoft-redis` - Redis cache (Port 6390)
- `mycosoft-qdrant` - Vector database (Port 6345)
- `mycosoft-mas-orchestrator` - MAS API (Port 8001)
- `mycosoft-n8n` - N8N workflows (Port 5678)
- `mycosoft-whisper` - Speech-to-text (Port 8765)
- `mycosoft-tts` - Text-to-speech (Port 5500)
- `mycosoft-myca-app` - MyCA Next.js app (Port 3001)
- `mycosoft-mas-dashboard` - MAS Dashboard (Port 3100)

## Stopping Services

### Stop Docker Containers
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
docker compose -f docker-compose.essential.yml down
```

### Stop Next.js
Press `Ctrl+C` in the terminal running `npm run dev`, or:
```powershell
# Find and kill the process
Get-Process | Where-Object {$_.Path -like "*node*"} | Stop-Process -Force
```

## Troubleshooting

### Port Already in Use
If a port is already in use, the service may already be running. Check with:
```powershell
netstat -ano | findstr ":3000"
```

### Docker Containers Not Starting
Check Docker is running:
```powershell
docker ps
```

If containers are stopped, restart them:
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
docker compose -f docker-compose.essential.yml restart
```

### Next.js Not Starting
Clear the Next.js cache and restart:
```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
Remove-Item -Recurse -Force .next
npm run dev
```

## Running Services Independently

All services run independently of Cursor. Once started:
- Docker containers will continue running until stopped
- Next.js dev server runs in the background
- Python services run as separate processes

To ensure services start on system boot, consider:
1. Using Windows Task Scheduler for the startup scripts
2. Configuring Docker Desktop to start on boot
3. Using Windows Services for critical services

## Notes

- The system is designed to run in development mode
- All services use `restart: unless-stopped` in Docker Compose
- Logs are available in the respective service directories
- The website runs on port 3000 by default (will use 3001, 3002, etc. if 3000 is busy)

