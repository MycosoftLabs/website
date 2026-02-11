# Cloudflare WebSocket Proxy Configuration - February 11, 2026

## Overview

This document describes how to configure Cloudflare to proxy WebSocket connections from the public website (`mycosoft.com`) to the PersonaPlex Bridge running on a VM (port 8999).

**Why needed**: PersonaPlex uses WebSocket for full-duplex voice communication. When the website is served over HTTPS, WebSocket connections must use WSS (secure WebSocket) to avoid mixed-content errors.

## Architecture

```
User Browser (HTTPS)
    ↓
    WSS connection: wss://mycosoft.com/voice/ws
    ↓
Cloudflare (WebSocket Proxy)
    ↓
    WS connection: ws://192.168.0.188:8999/api/chat
    ↓
PersonaPlex Bridge (MAS VM or Remote GPU)
```

## Step 1: Cloudflare Dashboard Settings

### Enable WebSocket Support

1. Log in to Cloudflare Dashboard: https://dash.cloudflare.com
2. Select `mycosoft.com` zone
3. Go to **Network** tab
4. Ensure **WebSockets** is toggled **ON**
   - If OFF, click to enable
   - This allows WebSocket connections through Cloudflare's proxy

### SSL/TLS Mode

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)** or **Full**
   - This ensures HTTPS → WSS upgrade works correctly
3. Go to **SSL/TLS** → **Edge Certificates**
4. Ensure **Always Use HTTPS** is enabled

## Step 2: Create Worker for WebSocket Proxy

Cloudflare Workers can proxy WebSocket connections to backend services.

### Option A: Using Cloudflare Workers (Recommended)

Create a Worker to handle `/voice/ws` route:

```javascript
// worker.js - PersonaPlex WebSocket Proxy
// Deploy at: mycosoft.com/voice/*

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Only proxy /voice/ws path
    if (!url.pathname.startsWith('/voice/ws')) {
      return new Response('Not Found', { status: 404 });
    }
    
    // Backend PersonaPlex Bridge
    // Change this to actual deployment location:
    // - MAS VM: ws://192.168.0.188:8999
    // - Remote GPU: wss://your-gpu-instance.runpod.io
    const BACKEND_WS = 'ws://192.168.0.188:8999/api/chat';
    
    // Upgrade request header check
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket upgrade', { status: 426 });
    }
    
    // Proxy WebSocket connection
    try {
      // Connect to backend
      const backendUrl = new URL(BACKEND_WS);
      const webSocketPair = new WebSocketPair();
      const client = webSocketPair[0];
      const server = webSocketPair[1];
      
      // Connect to backend WebSocket
      server.accept();
      const backend = await fetch(backendUrl.toString(), {
        headers: {
          'Upgrade': 'websocket',
        },
      });
      
      // Pipe data between client and backend
      backend.webSocket.addEventListener('message', event => {
        server.send(event.data);
      });
      
      server.addEventListener('message', event => {
        backend.webSocket.send(event.data);
      });
      
      backend.webSocket.addEventListener('close', () => {
        server.close();
      });
      
      server.addEventListener('close', () => {
        backend.webSocket.close();
      });
      
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (err) {
      return new Response(`WebSocket proxy error: ${err.message}`, { 
        status: 500 
      });
    }
  }
};
```

### Deploy Worker

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy worker
wrangler publish worker.js --name personaplex-proxy

# Bind worker to route
wrangler route add "mycosoft.com/voice/*" personaplex-proxy
```

### Option B: Using Page Rules (Simple, Limited)

If Worker is not available, use Page Rules:

1. Go to **Rules** → **Page Rules**
2. Click **Create Page Rule**
3. URL Pattern: `*mycosoft.com/voice/ws*`
4. Settings:
   - **Cache Level**: Bypass
   - **Disable Performance**
   - **Disable Security** (for WebSocket upgrade)
5. Click **Save and Deploy**

**Note**: Page Rules have limitations and may not reliably proxy WebSockets. Workers are strongly recommended.

## Step 3: DNS Configuration

Ensure DNS records point to correct backend:

1. Go to **DNS** → **Records**
2. Verify A/AAAA record for `mycosoft.com` points to:
   - **Sandbox VM**: `192.168.0.187` (if local network)
   - **Public IP**: If exposing to internet
3. Ensure **Proxy status** is **Proxied** (orange cloud icon)
   - This routes traffic through Cloudflare

## Step 4: Update Website Environment Variables

Once Cloudflare proxy is configured, update website `.env`:

```bash
# Production environment (mycosoft.com via Cloudflare)
NEXT_PUBLIC_PERSONAPLEX_WS_URL=wss://mycosoft.com/voice/ws

# OR if using subdomain
NEXT_PUBLIC_PERSONAPLEX_WS_URL=wss://voice.mycosoft.com/api/chat
```

## Step 5: Testing

### Test WebSocket Connection

```bash
# Install wscat for testing
npm install -g wscat

# Test connection
wscat -c wss://mycosoft.com/voice/ws

# Should connect and show: "Connected"
# Type a message and press Enter to send
```

### Browser Console Test

```javascript
// Open browser console on mycosoft.com
const ws = new WebSocket('wss://mycosoft.com/voice/ws');

ws.onopen = () => console.log('Connected!');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onerror = (error) => console.error('Error:', error);
ws.onclose = () => console.log('Closed');

// Send test message
ws.send(JSON.stringify({ type: 'ping' }));
```

## Troubleshooting

### Error: "WebSocket connection failed"

**Cause**: Backend not reachable or Cloudflare proxy misconfigured

**Fix**:
1. Verify backend is running: `curl http://192.168.0.188:8999/health`
2. Check Cloudflare Worker logs for errors
3. Ensure WebSocket is enabled in Cloudflare Network settings

### Error: "Mixed Content: The page was loaded over HTTPS, but requested an insecure WebSocket"

**Cause**: Using `ws://` instead of `wss://` on HTTPS site

**Fix**:
- Update `NEXT_PUBLIC_PERSONAPLEX_WS_URL` to use `wss://`
- Ensure Cloudflare SSL/TLS mode is **Full** or **Full (strict)**

### Error: "Error 1006: Connection was closed abnormally"

**Cause**: WebSocket upgrade failed or connection dropped

**Fix**:
1. Check backend PersonaPlex Bridge is running
2. Verify firewall allows port 8999
3. Check Cloudflare Worker timeout settings (increase if needed)
4. Review backend logs for errors

### High Latency / Slow Voice Response

**Cause**: Extra hop through Cloudflare adds latency

**Mitigation**:
1. Use Cloudflare's **Argo Smart Routing** (paid feature)
2. Deploy PersonaPlex geographically closer to users
3. Enable **HTTP/3** in Cloudflare (faster protocol)
4. Use **Cloudflare Stream** for optimized WebSocket delivery

## Security Considerations

### Rate Limiting

Protect PersonaPlex from abuse:

1. Go to **Security** → **WAF**
2. Create rule for `/voice/ws`:
   - **If** Path contains `/voice/ws`
   - **Then** Rate limit: 10 requests per 10 seconds
3. Click **Deploy**

### Authentication

PersonaPlex WebSocket should verify users:

**Backend (PersonaPlex Bridge)**:
```python
# Verify JWT token from frontend
def verify_websocket_auth(request):
    token = request.headers.get('Authorization')
    if not token or not verify_jwt(token):
        raise WebSocketException(code=1008, reason="Unauthorized")
```

**Frontend (Website)**:
```typescript
// Send auth token when connecting
const ws = new WebSocket('wss://mycosoft.com/voice/ws', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
```

## Cost Considerations

| Feature | Cost | Notes |
|---------|------|-------|
| WebSocket (Free Plan) | Free | Limited to 100k requests/day |
| WebSocket (Pro Plan) | $20/month | Unlimited requests |
| Cloudflare Workers | $5/month + $0.50/million requests | Recommended for proxy |
| Argo Smart Routing | $5/month + $0.10/GB | Reduces latency |

## Monitoring

### Cloudflare Analytics

1. Go to **Analytics** → **Traffic**
2. Filter by path: `/voice/ws`
3. Monitor:
   - Request count
   - Error rate
   - Bandwidth usage
   - Response time

### Alerts

Create alert for WebSocket failures:

1. Go to **Notifications** → **Add**
2. Alert type: **HTTP 5XX errors**
3. Filter: Path contains `/voice/ws`
4. Threshold: > 10 errors in 5 minutes
5. Notification: Email or Slack

## Next Steps

1. ✅ Enable WebSocket in Cloudflare Network settings
2. ✅ Deploy Cloudflare Worker for `/voice/ws` proxy
3. ✅ Update website env vars to `wss://mycosoft.com/voice/ws`
4. ✅ Test connection from live site
5. ✅ Configure rate limiting and authentication
6. ✅ Set up monitoring alerts

## References

- [Cloudflare WebSocket Docs](https://developers.cloudflare.com/fundamentals/get-started/reference/websockets/)
- [Cloudflare Workers WebSocket](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [WebSocket Security Best Practices](https://datatracker.ietf.org/doc/html/rfc6455#section-10)
