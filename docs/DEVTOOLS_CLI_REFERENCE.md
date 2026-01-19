# Mycosoft DevTools CLI Reference

This document covers the CLI tools installed for development and operations tasks.

## Installed CLI Tools

### 1. Wrangler (Cloudflare CLI)

**Purpose**: Manage Cloudflare Workers, DNS, Tunnels, and other Cloudflare services.

**Installation**: `npm install -g wrangler`

**Common Commands**:
```bash
# Login to Cloudflare
wrangler login

# List DNS records
wrangler dns:list <zone-id>

# Manage Cloudflare Tunnels
wrangler tunnel list
wrangler tunnel run <tunnel-name>

# Deploy Workers
wrangler deploy

# Check Cloudflare status
wrangler whoami
```

**Use Cases for Mycosoft**:
- Managing sandbox.mycosoft.com DNS
- Cloudflare Tunnel configuration for Docker services
- Deploying edge functions if needed
- Cache purging and management

---

### 2. kill-port

**Purpose**: Kill processes running on specific ports.

**Installation**: `npm install -g kill-port`

**Usage**:
```bash
# Kill process on port 3000
kill-port 3000

# Kill multiple ports
kill-port 3000 8000 8001

# Kill with method specification
kill-port 3000 --method tcp
kill-port 3000 --method udp
```

**Use Cases for Mycosoft**:
- Free up ports when Docker containers fail to stop cleanly
- Kill stuck development servers
- Clear ports before starting MAS services
- Resolve MycoBrain serial port conflicts

---

### 3. fkill-cli

**Purpose**: Interactive process killing tool with fuzzy search.

**Installation**: `npm install -g fkill-cli`

**Usage**:
```bash
# Interactive mode - shows all processes
fkill

# Kill by process name
fkill node
fkill python

# Kill by port
fkill :3000

# Force kill
fkill node --force

# Kill silently (no confirmation)
fkill node --silent
```

**Use Cases for Mycosoft**:
- Find and kill zombie processes
- Interactive process management during development
- Quick cleanup of stuck services

---

## Recommended Additional Tools

### Port-Killer (Desktop App)

The `port-killer` app mentioned in the integration plan is a desktop application (not CLI).

**Installation**:
1. Download from: https://github.com/productdevbook/port-killer/releases
2. Install the Windows/macOS version
3. Launch from desktop

**Features**:
- GUI for port management
- Kubernetes port forward integration
- Cloudflare Tunnel integration
- Favorites and notifications

---

### disable-cloudflare-cli (GitHub only)

This tool is not on npm but can be installed from GitHub:

```bash
# Clone and install
git clone https://github.com/midudev/disable-cloudflare-cli.git
cd disable-cloudflare-cli
npm install
npm link
```

**Usage**:
```bash
# Interactive mode
disable-cloudflare

# Direct zone management
disable-cloudflare --zone mycosoft.com
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Kill port 3000 | `kill-port 3000` |
| Kill node processes | `fkill node` |
| Interactive process kill | `fkill` |
| Check Cloudflare login | `wrangler whoami` |
| List Cloudflare tunnels | `wrangler tunnel list` |
| Purge Cloudflare cache | `wrangler kv:bulk delete --binding=CACHE` |

## Integration with Mycosoft Services

### Common Port Assignments

| Service | Port |
|---------|------|
| Mycosoft Website | 3000 |
| MINDEX API | 8000 |
| MAS Orchestrator | 8001 |
| Grafana | 3002 |
| Prometheus | 9090 |
| n8n | 5678 |
| Qdrant | 6345 |
| Redis | 6390 |
| Whisper | 8765 |
| TTS Piper | 10200 |
| Voice UI | 8090 |
| MYCA Dashboard | 3100 |
| Ollama | 11434 |
| zpdf Service | 8080 |
| maptoposter | 8081 |

### Startup Script Example

```powershell
# Clear common ports before starting services
kill-port 3000 8000 8001 3002

# Start MAS services
docker-compose -f docker-compose.always-on.yml up -d
```

---

## Environment Variables

Add to your shell profile (`.bashrc`, `.zshrc`, or PowerShell profile):

```bash
# Cloudflare API Token (for wrangler)
export CLOUDFLARE_API_TOKEN="your-token-here"

# Cloudflare Account ID
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

For PowerShell:
```powershell
$env:CLOUDFLARE_API_TOKEN = "your-token-here"
$env:CLOUDFLARE_ACCOUNT_ID = "your-account-id"
```

---

*Last Updated: January 18, 2026*
*Owner: Mycosoft DevOps*
