/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WebRTC Signaling Server for E2CC - February 5, 2026
 * 
 * Handles WebRTC signaling between Omniverse Kit and web clients.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8212;
const E2CC_URL = process.env.E2CC_URL || 'http://e2cc:8211';

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP Server
// ═══════════════════════════════════════════════════════════════════════════════

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }

  if (req.url === '/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'e2cc-signaling',
      version: '1.0.0',
      e2cc_url: E2CC_URL,
      clients: clients.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Server
// ═══════════════════════════════════════════════════════════════════════════════

const wss = new WebSocket.Server({ server });
const clients = new Map();
let clientIdCounter = 0;

wss.on('connection', (ws, req) => {
  const clientId = ++clientIdCounter;
  const clientInfo = {
    id: clientId,
    ws,
    connectedAt: new Date().toISOString(),
    ip: req.socket.remoteAddress
  };
  
  clients.set(clientId, clientInfo);
  console.log(`[${new Date().toISOString()}] Client ${clientId} connected from ${clientInfo.ip}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId,
    e2ccUrl: E2CC_URL,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientId, message);
    } catch (e) {
      console.error(`[${new Date().toISOString()}] Invalid message from client ${clientId}:`, e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`[${new Date().toISOString()}] Client ${clientId} disconnected`);
  });

  ws.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Client ${clientId} error:`, err.message);
    clients.delete(clientId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Message Handling
// ═══════════════════════════════════════════════════════════════════════════════

function handleMessage(clientId, message) {
  console.log(`[${new Date().toISOString()}] Message from client ${clientId}:`, message.type);

  switch (message.type) {
    case 'request_stream':
      handleStreamRequest(clientId, message);
      break;
    
    case 'offer':
    case 'answer':
    case 'ice_candidate':
      forwardToE2CC(clientId, message);
      break;
    
    case 'layer_toggle':
    case 'set_time':
    case 'set_bounds':
    case 'run_model':
      forwardCommand(clientId, message);
      break;
    
    case 'ping':
      sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
      break;
    
    default:
      console.warn(`Unknown message type: ${message.type}`);
  }
}

function handleStreamRequest(clientId, message) {
  // Generate stream configuration
  const streamConfig = {
    type: 'stream_config',
    e2ccUrl: E2CC_URL,
    streamId: `stream-${clientId}-${Date.now()}`,
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
    resolution: message.resolution || [1920, 1080],
    bitrate: message.bitrate || 10000000
  };

  sendToClient(clientId, streamConfig);
}

function forwardToE2CC(clientId, message) {
  // In production, this would forward to the Omniverse Kit WebRTC endpoint
  console.log(`[${new Date().toISOString()}] Forwarding ${message.type} to E2CC for client ${clientId}`);
  
  // Acknowledge to client
  sendToClient(clientId, {
    type: `${message.type}_ack`,
    clientId,
    timestamp: Date.now()
  });
}

function forwardCommand(clientId, message) {
  console.log(`[${new Date().toISOString()}] Command from client ${clientId}:`, message);
  
  // Broadcast command acknowledgment
  sendToClient(clientId, {
    type: 'command_ack',
    command: message.type,
    status: 'received',
    timestamp: Date.now()
  });
}

function sendToClient(clientId, message) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function broadcast(message, excludeClientId = null) {
  clients.forEach((client, id) => {
    if (id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] E2CC Signaling Server running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] E2CC URL: ${E2CC_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Shutdown] Received SIGTERM, closing connections...');
  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });
  server.close(() => {
    console.log('[Shutdown] Server closed');
    process.exit(0);
  });
});
