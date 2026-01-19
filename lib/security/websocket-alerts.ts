/**
 * WebSocket Real-Time Alerts System
 * Provides real-time alert broadcasting to connected clients
 * Uses Server-Sent Events (SSE) as a fallback for WebSocket
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RealTimeAlert {
  id: string;
  timestamp: string;
  type: 'security_event' | 'incident' | 'playbook' | 'scan' | 'system';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  requiresAction?: boolean;
  actionUrl?: string;
}

export interface AlertSubscriber {
  id: string;
  callback: (alert: RealTimeAlert) => void;
  filters?: {
    severities?: string[];
    types?: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
// ALERT MANAGER (Server-side singleton)
// ═══════════════════════════════════════════════════════════════

class AlertManager {
  private static instance: AlertManager;
  private subscribers: Map<string, AlertSubscriber> = new Map();
  private alertQueue: RealTimeAlert[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  
  private constructor() {}
  
  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }
  
  /**
   * Subscribe to real-time alerts
   */
  subscribe(subscriber: AlertSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`[AlertManager] Subscriber added: ${subscriber.id} (total: ${this.subscribers.size})`);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber.id);
      console.log(`[AlertManager] Subscriber removed: ${subscriber.id} (total: ${this.subscribers.size})`);
    };
  }
  
  /**
   * Broadcast an alert to all subscribers
   */
  broadcast(alert: RealTimeAlert): void {
    // Add to queue for new subscribers
    this.alertQueue.push(alert);
    if (this.alertQueue.length > this.MAX_QUEUE_SIZE) {
      this.alertQueue.shift();
    }
    
    console.log(`[AlertManager] Broadcasting alert: ${alert.type} - ${alert.title}`);
    
    // Notify all subscribers
    this.subscribers.forEach((subscriber) => {
      try {
        // Check filters
        if (subscriber.filters) {
          if (subscriber.filters.severities && !subscriber.filters.severities.includes(alert.severity)) {
            return;
          }
          if (subscriber.filters.types && !subscriber.filters.types.includes(alert.type)) {
            return;
          }
        }
        
        subscriber.callback(alert);
      } catch (error) {
        console.error(`[AlertManager] Error notifying subscriber ${subscriber.id}:`, error);
      }
    });
  }
  
  /**
   * Get recent alerts from queue
   */
  getRecentAlerts(limit = 20): RealTimeAlert[] {
    return this.alertQueue.slice(-limit).reverse();
  }
  
  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Export singleton instance
export const alertManager = AlertManager.getInstance();

// ═══════════════════════════════════════════════════════════════
// ALERT CREATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Create and broadcast a security event alert
 */
export function broadcastSecurityEvent(event: {
  event_type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source_ip?: string;
  metadata?: Record<string, unknown>;
}): RealTimeAlert {
  const alert: RealTimeAlert = {
    id: `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type: 'security_event',
    severity: event.severity,
    title: `Security Event: ${event.event_type}`,
    message: event.description,
    data: {
      event_type: event.event_type,
      source_ip: event.source_ip,
      ...event.metadata,
    },
    requiresAction: ['high', 'critical'].includes(event.severity),
    actionUrl: '/security',
  };
  
  alertManager.broadcast(alert);
  return alert;
}

/**
 * Create and broadcast an incident alert
 */
export function broadcastIncidentAlert(incident: {
  incident_id: string;
  title: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: string;
  action: 'created' | 'updated' | 'escalated' | 'resolved';
}): RealTimeAlert {
  const actionText = {
    created: 'New incident created',
    updated: 'Incident updated',
    escalated: 'Incident escalated',
    resolved: 'Incident resolved',
  };
  
  const alert: RealTimeAlert = {
    id: `rt-inc-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'incident',
    severity: incident.action === 'resolved' ? 'info' : incident.severity,
    title: `${actionText[incident.action]}: ${incident.title}`,
    message: `Incident ${incident.incident_id} has been ${incident.action}. Status: ${incident.status}`,
    data: {
      incident_id: incident.incident_id,
      status: incident.status,
      action: incident.action,
    },
    requiresAction: incident.action !== 'resolved',
    actionUrl: `/security/incidents`,
  };
  
  alertManager.broadcast(alert);
  return alert;
}

/**
 * Create and broadcast a playbook execution alert
 */
export function broadcastPlaybookAlert(playbook: {
  playbook_id: string;
  playbook_name: string;
  status: 'started' | 'completed' | 'failed';
  trigger_event?: string;
}): RealTimeAlert {
  const severity = playbook.status === 'failed' ? 'high' : 'info';
  
  const alert: RealTimeAlert = {
    id: `rt-pb-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'playbook',
    severity,
    title: `Playbook ${playbook.status}: ${playbook.playbook_name}`,
    message: `Playbook ${playbook.playbook_id} has ${playbook.status}`,
    data: {
      playbook_id: playbook.playbook_id,
      playbook_name: playbook.playbook_name,
      status: playbook.status,
      trigger_event: playbook.trigger_event,
    },
    requiresAction: playbook.status === 'failed',
    actionUrl: '/security',
  };
  
  alertManager.broadcast(alert);
  return alert;
}

/**
 * Create and broadcast a scan alert
 */
export function broadcastScanAlert(scan: {
  scan_id: string;
  scan_type: string;
  status: 'started' | 'completed' | 'failed';
  target: string;
  findings?: number;
}): RealTimeAlert {
  const severity = scan.findings && scan.findings > 0 ? 'medium' : 'info';
  
  const alert: RealTimeAlert = {
    id: `rt-scan-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'scan',
    severity,
    title: `Scan ${scan.status}: ${scan.scan_type}`,
    message: scan.status === 'completed' 
      ? `Scan of ${scan.target} completed with ${scan.findings || 0} findings`
      : `Scan of ${scan.target} has ${scan.status}`,
    data: {
      scan_id: scan.scan_id,
      scan_type: scan.scan_type,
      status: scan.status,
      target: scan.target,
      findings: scan.findings,
    },
    requiresAction: (scan.findings || 0) > 0,
    actionUrl: '/security/redteam',
  };
  
  alertManager.broadcast(alert);
  return alert;
}

/**
 * Create and broadcast a system alert
 */
export function broadcastSystemAlert(system: {
  component: string;
  status: 'healthy' | 'degraded' | 'down' | 'recovered';
  message: string;
}): RealTimeAlert {
  const severityMap: Record<string, 'info' | 'low' | 'medium' | 'high' | 'critical'> = {
    healthy: 'info',
    recovered: 'low',
    degraded: 'medium',
    down: 'critical',
  };
  
  const alert: RealTimeAlert = {
    id: `rt-sys-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'system',
    severity: severityMap[system.status],
    title: `System ${system.status}: ${system.component}`,
    message: system.message,
    data: {
      component: system.component,
      status: system.status,
    },
    requiresAction: system.status === 'down',
    actionUrl: '/security',
  };
  
  alertManager.broadcast(alert);
  return alert;
}

// ═══════════════════════════════════════════════════════════════
// SSE STREAM CREATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Create a Server-Sent Events stream for real-time alerts
 * Use this in an API route handler
 */
export function createAlertStream(options?: {
  severities?: string[];
  types?: string[];
}): ReadableStream {
  const subscriberId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initMessage = `data: ${JSON.stringify({ type: 'connected', subscriberId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initMessage));
      
      // Send recent alerts
      const recentAlerts = alertManager.getRecentAlerts(10);
      recentAlerts.forEach(alert => {
        const message = `data: ${JSON.stringify(alert)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      });
      
      // Subscribe to new alerts
      const unsubscribe = alertManager.subscribe({
        id: subscriberId,
        callback: (alert) => {
          try {
            const message = `data: ${JSON.stringify(alert)}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
          } catch {
            // Stream closed
            unsubscribe();
          }
        },
        filters: options,
      });
      
      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(ping));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30000);
      
      // Cleanup on close
      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE HOOK (for React components)
// ═══════════════════════════════════════════════════════════════

/**
 * React hook for subscribing to real-time alerts
 * Usage: const { alerts, isConnected } = useRealTimeAlerts()
 */
export function createClientAlertSubscription(
  onAlert: (alert: RealTimeAlert) => void,
  options?: { severities?: string[]; types?: string[] }
): {
  connect: () => void;
  disconnect: () => void;
} {
  let eventSource: EventSource | null = null;
  
  return {
    connect: () => {
      if (typeof window === 'undefined') return;
      
      const params = new URLSearchParams();
      if (options?.severities) params.set('severities', options.severities.join(','));
      if (options?.types) params.set('types', options.types.join(','));
      
      const url = `/api/security/alerts/stream${params.toString() ? `?${params}` : ''}`;
      eventSource = new EventSource(url);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'ping' && data.type !== 'connected') {
            onAlert(data as RealTimeAlert);
          }
        } catch (error) {
          console.error('[AlertSubscription] Error parsing event:', error);
        }
      };
      
      eventSource.onerror = () => {
        console.warn('[AlertSubscription] Connection error, reconnecting...');
        eventSource?.close();
        // Reconnect after 5 seconds
        setTimeout(() => {
          if (eventSource) {
            eventSource = new EventSource(url);
          }
        }, 5000);
      };
    },
    
    disconnect: () => {
      eventSource?.close();
      eventSource = null;
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// AUDIO ALERTS (Client-side)
// ═══════════════════════════════════════════════════════════════

export const ALERT_SOUNDS = {
  critical: '/sounds/alert-critical.mp3',
  high: '/sounds/alert-high.mp3',
  medium: '/sounds/alert-medium.mp3',
  default: '/sounds/alert-default.mp3',
};

/**
 * Play alert sound based on severity
 * Call this from client-side only
 */
export function playAlertSound(severity: string): void {
  if (typeof window === 'undefined') return;
  
  const soundUrl = ALERT_SOUNDS[severity as keyof typeof ALERT_SOUNDS] || ALERT_SOUNDS.default;
  
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Audio autoplay blocked, ignore
    });
  } catch {
    // Audio not available
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

/**
 * Show browser notification for an alert
 */
export function showBrowserNotification(alert: RealTimeAlert): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  const iconMap: Record<string, string> = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
    info: '📋',
  };
  
  const notification = new Notification(`${iconMap[alert.severity] || '🔔'} ${alert.title}`, {
    body: alert.message,
    icon: '/logo.png',
    tag: alert.id,
    requireInteraction: ['critical', 'high'].includes(alert.severity),
  });
  
  notification.onclick = () => {
    window.focus();
    if (alert.actionUrl) {
      window.location.href = alert.actionUrl;
    }
    notification.close();
  };
}
