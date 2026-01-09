# NatureOS Docker Integration

## Overview

The NatureOS Containers page provides direct integration with Docker Engine for managing containers, images, and MCP (Model Context Protocol) servers.

## Enabling Docker API Access

### Windows Docker Desktop

1. Open Docker Desktop settings
2. Go to **Settings → General**
3. Enable **"Expose daemon on tcp://localhost:2375 without TLS"**
4. Click **Apply & Restart**

Or add to Docker daemon.json:
```json
{
  "hosts": ["tcp://localhost:2375", "npipe://"]
}
```

### Linux/Mac

For Unix socket access (default):
```bash
# The API uses /var/run/docker.sock by default
# No additional configuration needed
```

For TCP access:
```bash
# Edit /etc/docker/daemon.json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
sudo systemctl restart docker
```

## Environment Variables

Add to `.env.local`:

```env
# Docker API - Windows
DOCKER_API_URL=http://localhost:2375

# Docker API - Linux/Mac (default)
DOCKER_API_URL=http://host.docker.internal:2375

# Docker Hub (optional)
DOCKER_HUB_USERNAME=your-username
DOCKER_HUB_TOKEN=your-access-token
```

## Features

### Container Management
- View all running and stopped containers
- Start, stop, restart containers
- View container logs
- Clone containers for testing
- Backup to NAS

### MCP Server Management
- Auto-detect MCP server containers
- Deploy pre-built MCP servers
- Start/stop/restart MCP servers
- View capabilities and ports

### Docker Hub Integration
- Search Docker Hub for images
- Pull images directly
- Prune unused images

## API Endpoints

### `/api/docker/containers`
- **GET**: List all containers with stats
- **POST**: Container actions (start, stop, restart, clone, backup)

### `/api/docker/containers/logs`
- **GET**: Fetch container logs
- Query params: `id`, `tail`, `timestamps`

### `/api/docker/images`
- **GET**: List local images or search Docker Hub
- **POST**: Pull images, prune unused

### `/api/docker/mcp`
- **GET**: List MCP server containers
- **POST**: Deploy, start, stop MCP servers

## MCP Server Detection

Containers are detected as MCP servers if they:
1. Have image name matching `mcp-server`, `mcp/`, or `modelcontextprotocol/`
2. Have label `com.docker.mcp=true`

### Known MCP Server Types
- `filesystem` - File system access
- `github` - GitHub integration
- `git` - Git operations
- `postgres` - PostgreSQL queries
- `sqlite` - SQLite database
- `slack` - Slack integration
- `puppeteer` - Browser automation
- `fetch` - HTTP requests
- `memory` - Knowledge storage
- `time` - Time utilities
- `everything` - Search integration

## Troubleshooting

### "Demo Mode" / Docker Not Connected

1. Ensure Docker Desktop is running
2. Enable TCP API access (see above)
3. Check if port 2375 is accessible:
   ```powershell
   curl http://localhost:2375/version
   ```

### Container Actions Not Working

1. Check Docker permissions
2. Verify the container ID is correct
3. Check container logs for errors

### MCP Servers Not Detected

1. Ensure container image name includes "mcp"
2. Or add label: `com.docker.mcp=true`
3. Restart the containers page to refresh

## Portainer Integration

The page includes a link to Portainer at `http://localhost:9000` for advanced Docker management.

To install Portainer:
```bash
docker run -d -p 9000:9000 --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer-ce
```



































