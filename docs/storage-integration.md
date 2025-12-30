# NatureOS Storage Integration

## Overview

The NatureOS Storage page integrates with your UniFi Dream Machine network and NAS devices to provide unified storage management.

## Supported Devices

### UniFi Dream Machine
- **Automatic Detection**: The system attempts to connect to the UniFi Controller at `https://192.168.1.1`
- **Features**: Network client count, WAN status, device management link

### NAS Systems
Supported NAS types:
- **Synology** (DSM 6/7) - Port 5000/5001
- **QNAP** (QTS) - Port 8080
- **TrueNAS** - Port 80/443
- **UniFi** - Built-in storage

## Environment Variables

Add these to your `.env.local` file:

```env
# UniFi Dream Machine / Controller
UNIFI_CONTROLLER_URL=https://192.168.1.1
UNIFI_USERNAME=admin
UNIFI_PASSWORD=your-password

# NAS Configuration
NAS_HOST=192.168.1.50
NAS_API_PORT=5000
NAS_USERNAME=admin
NAS_PASSWORD=your-nas-password
NAS_TYPE=synology   # Options: synology, qnap, truenas, unifi
```

## Network Setup

### Required Network Access
The website server needs access to:
1. **Dream Machine**: `https://192.168.1.1` (or your UDM IP)
2. **NAS**: `http://192.168.1.50:5000` (Synology) or appropriate port

### SMB/CIFS Shares
For file browsing, configure SMB shares:
- `\\mycosoft-nas\shared` - General shared files
- `\\mycosoft-nas\mindex` - MINDEX database exports
- `\\mycosoft-nas\backups` - System backups
- `\\mycosoft-nas\media` - Media files
- `\\mycosoft-nas\research` - Research documents

## API Endpoints

### `/api/storage/nas`
- **GET**: Returns NAS status, shares, and Dream Machine info
- **POST**: File operations (list, create-folder, delete)

### `/api/storage/gdrive`
- **GET**: Returns Google Drive quota and recent files
- **POST**: Google Drive operations (list, create-folder, share)

### `/api/storage/files`
- **GET**: Unified file browser across all storage sources
- Query params: `path`, `source` (nas/gdrive/all), `search`

## Features

1. **Unified View**: See all storage locations in one place
2. **Real-time Status**: Connection status for NAS and Dream Machine
3. **File Browser**: Browse files across NAS and Google Drive
4. **Quick Actions**: Upload, share, and manage files
5. **Storage Analytics**: View usage across all connected storage

## Troubleshooting

### NAS Not Connecting
1. Verify the NAS IP address is correct
2. Check if the NAS API port is open (default: 5000 for Synology)
3. Ensure the website server can reach the NAS on your network

### Dream Machine Not Detected
1. Verify the controller URL (usually https://192.168.1.1)
2. Check if the UniFi controller is accessible
3. Self-signed certificates may require skipping SSL verification

### Google Drive Not Syncing
1. Set up OAuth credentials in Google Cloud Console
2. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN to `.env.local`










