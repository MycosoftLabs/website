/**
 * Blitzortung Lightning Network Connector
 * February 4, 2026
 * 
 * Connects to Blitzortung's real-time lightning detection network
 * Provides WebSocket-based streaming of lightning strike data
 * 
 * Blitzortung is a community lightning detection network
 * https://www.blitzortung.org/
 */

import type { Event, Location } from "@/types/oei";

// =============================================================================
// TYPES
// =============================================================================

export interface LightningStrike {
  id: string;
  time: number; // Unix timestamp in nanoseconds
  lat: number;
  lon: number;
  alt?: number; // Altitude in meters (if available)
  pol?: number; // Polarity: 1 = positive, -1 = negative
  mA?: number; // Peak current in milliamperes
  mcg?: number; // Megajoule count
  sta?: number; // Number of stations that detected this strike
  delay?: number; // Processing delay in ms
  region: number; // Region code
}

export interface BlitzortungConfig {
  regions?: number[]; // Region codes to subscribe to (default: all)
  maxAge?: number; // Max strike age to keep in memory (ms)
  onStrike?: (strike: LightningStrike) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// Blitzortung WebSocket endpoints (by region)
const WS_ENDPOINTS: Record<number, string> = {
  1: "wss://ws1.blitzortung.org:3000", // Europe
  2: "wss://ws2.blitzortung.org:3000", // Americas
  3: "wss://ws3.blitzortung.org:3000", // Asia/Pacific
  4: "wss://ws4.blitzortung.org:3000", // Africa
};

// Fallback polling endpoint if WebSocket is not available
const POLLING_ENDPOINT = "https://map.blitzortung.org/Strokes/JSO/1h.json";

// =============================================================================
// BLITZORTUNG WEBSOCKET CLIENT
// =============================================================================

export class BlitzortungClient {
  private config: Required<BlitzortungConfig>;
  private connections: Map<number, WebSocket> = new Map();
  private strikes: Map<string, LightningStrike> = new Map();
  private reconnectTimers: Map<number, NodeJS.Timeout> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private strikeCount: number = 0;

  constructor(config: BlitzortungConfig = {}) {
    this.config = {
      regions: config.regions || [1, 2, 3, 4], // All regions by default
      maxAge: config.maxAge || 60000, // 1 minute
      onStrike: config.onStrike || (() => {}),
      onError: config.onError || ((e) => console.error("[Blitzortung] Error:", e)),
      onConnect: config.onConnect || (() => {}),
      onDisconnect: config.onDisconnect || (() => {}),
    };
  }

  /**
   * Connect to Blitzortung WebSocket servers
   */
  connect(): void {
    if (this.isConnected) return;

    for (const region of this.config.regions) {
      this.connectToRegion(region);
    }

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldStrikes();
    }, 10000);

    this.isConnected = true;
  }

  private connectToRegion(region: number): void {
    const endpoint = WS_ENDPOINTS[region];
    if (!endpoint) {
      console.warn(`[Blitzortung] Unknown region: ${region}`);
      return;
    }

    try {
      const ws = new WebSocket(endpoint);

      ws.onopen = () => {
        console.log(`[Blitzortung] Connected to region ${region}`);
        this.connections.set(region, ws);
        
        // Clear any pending reconnect timer
        const timer = this.reconnectTimers.get(region);
        if (timer) {
          clearTimeout(timer);
          this.reconnectTimers.delete(region);
        }

        this.config.onConnect();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processMessage(data, region);
        } catch (error) {
          // Blitzortung may send binary or non-JSON messages
          this.processBinaryMessage(event.data, region);
        }
      };

      ws.onerror = (error) => {
        console.error(`[Blitzortung] WebSocket error region ${region}:`, error);
        this.config.onError(new Error(`WebSocket error for region ${region}`));
      };

      ws.onclose = () => {
        console.log(`[Blitzortung] Disconnected from region ${region}`);
        this.connections.delete(region);
        this.scheduleReconnect(region);
        this.config.onDisconnect();
      };
    } catch (error) {
      console.error(`[Blitzortung] Failed to connect to region ${region}:`, error);
      this.scheduleReconnect(region);
    }
  }

  private scheduleReconnect(region: number): void {
    // Exponential backoff
    const existingTimer = this.reconnectTimers.get(region);
    if (existingTimer) return;

    const delay = 5000 + Math.random() * 5000; // 5-10 seconds
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(region);
      if (this.isConnected) {
        this.connectToRegion(region);
      }
    }, delay);

    this.reconnectTimers.set(region, timer);
  }

  private processMessage(data: any, region: number): void {
    // Blitzortung sends strike data in various formats
    if (Array.isArray(data)) {
      // Batch of strikes
      for (const item of data) {
        this.processStrike(item, region);
      }
    } else if (data.time || data.lat) {
      // Single strike
      this.processStrike(data, region);
    }
  }

  private processBinaryMessage(data: any, region: number): void {
    // Handle binary strike data if needed
    // Blitzortung may use compressed formats
  }

  private processStrike(data: any, region: number): void {
    const strike: LightningStrike = {
      id: `strike-${Date.now()}-${this.strikeCount++}`,
      time: data.time || Date.now() * 1000000, // Convert to ns if not provided
      lat: data.lat || data.latitude || 0,
      lon: data.lon || data.longitude || 0,
      alt: data.alt,
      pol: data.pol,
      mA: data.mA,
      mcg: data.mcg,
      sta: data.sta,
      delay: data.delay,
      region,
    };

    this.strikes.set(strike.id, strike);
    this.config.onStrike(strike);
  }

  private cleanupOldStrikes(): void {
    const now = Date.now();
    const maxAge = this.config.maxAge;

    for (const [id, strike] of this.strikes) {
      const strikeTime = strike.time / 1000000; // Convert ns to ms
      if (now - strikeTime > maxAge) {
        this.strikes.delete(id);
      }
    }
  }

  /**
   * Get all recent strikes
   */
  getStrikes(): LightningStrike[] {
    return Array.from(this.strikes.values());
  }

  /**
   * Get strikes within bounds
   */
  getStrikesInBounds(bounds: { north: number; south: number; east: number; west: number }): LightningStrike[] {
    return this.getStrikes().filter(
      (s) =>
        s.lat >= bounds.south &&
        s.lat <= bounds.north &&
        s.lon >= bounds.west &&
        s.lon <= bounds.east
    );
  }

  /**
   * Get strike count per minute (rate)
   */
  getStrikeRate(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    let count = 0;
    for (const strike of this.strikes.values()) {
      const strikeTime = strike.time / 1000000;
      if (strikeTime >= oneMinuteAgo) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Disconnect from all servers
   */
  disconnect(): void {
    this.isConnected = false;

    for (const [region, ws] of this.connections) {
      ws.close();
    }
    this.connections.clear();

    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.strikes.clear();
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): { connected: boolean; regions: number[] } {
    return {
      connected: this.connections.size > 0,
      regions: Array.from(this.connections.keys()),
    };
  }
}

// =============================================================================
// POLLING-BASED FALLBACK CLIENT
// =============================================================================

export class BlitzortungPollingClient {
  private config: Required<BlitzortungConfig>;
  private strikes: LightningStrike[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval = 10000; // 10 seconds
  private isActive = false;
  private strikeCount = 0;

  constructor(config: BlitzortungConfig = {}) {
    this.config = {
      regions: config.regions || [1, 2, 3, 4],
      maxAge: config.maxAge || 60000,
      onStrike: config.onStrike || (() => {}),
      onError: config.onError || ((e) => console.error("[Blitzortung] Error:", e)),
      onConnect: config.onConnect || (() => {}),
      onDisconnect: config.onDisconnect || (() => {}),
    };
  }

  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.fetchStrikes();

    this.intervalId = setInterval(() => {
      this.fetchStrikes();
    }, this.pollInterval);

    this.config.onConnect();
  }

  private async fetchStrikes(): Promise<void> {
    try {
      // Use our API proxy to avoid CORS issues
      const response = await fetch("/api/oei/lightning");
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const now = Date.now();

      // Parse strikes from response
      const newStrikes: LightningStrike[] = (data.strikes || data || []).map((s: any) => ({
        id: `poll-strike-${this.strikeCount++}`,
        time: (s.time || s.timestamp || now) * 1000000,
        lat: s.lat || s.latitude || 0,
        lon: s.lon || s.longitude || 0,
        alt: s.alt,
        pol: s.pol,
        mA: s.mA,
        sta: s.sta,
        region: s.region || 1,
      }));

      // Add new strikes
      for (const strike of newStrikes) {
        this.config.onStrike(strike);
      }

      // Update internal list
      this.strikes = [...this.strikes, ...newStrikes].filter(
        (s) => now - s.time / 1000000 < this.config.maxAge
      );
    } catch (error) {
      console.error("[Blitzortung Polling] Error:", error);
      this.config.onError(error as Error);
    }
  }

  stop(): void {
    this.isActive = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.strikes = [];
    this.config.onDisconnect();
  }

  getStrikes(): LightningStrike[] {
    return this.strikes;
  }

  getStrikesInBounds(bounds: { north: number; south: number; east: number; west: number }): LightningStrike[] {
    return this.strikes.filter(
      (s) =>
        s.lat >= bounds.south &&
        s.lat <= bounds.north &&
        s.lon >= bounds.west &&
        s.lon <= bounds.east
    );
  }

  getStrikeRate(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    return this.strikes.filter((s) => s.time / 1000000 >= oneMinuteAgo).length;
  }
}

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/**
 * Convert Blitzortung strike to OEI Event format
 */
export function strikeToEvent(strike: LightningStrike): Event {
  return {
    id: `blitz_${strike.id}`,
    type: "lightning",
    title: `Lightning Strike`,
    description: strike.sta
      ? `Detected by ${strike.sta} stations`
      : "Lightning strike detected",
    location: {
      latitude: strike.lat,
      longitude: strike.lon,
      source: "blitzortung",
    } as Location,
    createdAt: new Date(strike.time / 1000000).toISOString(),
    updatedAt: new Date().toISOString(),
    startTime: new Date(strike.time / 1000000).toISOString(),
    status: "active",
    severity: strike.pol === 1 ? "high" : "medium",
    provenance: {
      source: "blitzortung",
      sourceId: strike.id,
      collectedAt: new Date().toISOString(),
      reliability: strike.sta ? Math.min(1, strike.sta / 10) : 0.8,
    },
    tags: ["lightning", "weather", "atmospheric"],
    properties: {
      polarity: strike.pol,
      current_mA: strike.mA,
      stations: strike.sta,
      region: strike.region,
    },
  };
}

// =============================================================================
// SINGLETON & FACTORY
// =============================================================================

let clientInstance: BlitzortungClient | BlitzortungPollingClient | null = null;

/**
 * Get or create Blitzortung client
 * Uses WebSocket if available, falls back to polling
 */
export function getBlitzortungClient(
  config?: BlitzortungConfig,
  usePolling: boolean = false
): BlitzortungClient | BlitzortungPollingClient {
  if (!clientInstance) {
    if (usePolling || typeof WebSocket === "undefined") {
      clientInstance = new BlitzortungPollingClient(config);
    } else {
      clientInstance = new BlitzortungClient(config);
    }
  }
  return clientInstance;
}

export default BlitzortungClient;
