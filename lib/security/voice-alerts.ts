/**
 * Voice Alert System
 * 
 * Provides voice notifications for HIGH and CRITICAL security incidents.
 * Integrates with OpenedAI Speech TTS service for audio synthesis.
 * 
 * Features:
 * - Automatic alerts for high/critical incidents
 * - Priority queue for concurrent alerts
 * - Voice customization (speed, pitch, voice model)
 * - MYCA orchestrator integration
 * 
 * @version 1.0.0
 * @date January 24, 2026
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface VoiceAlertConfig {
  enabled: boolean;
  tts_endpoint: string;
  voice_model: string;
  speed: number;
  auto_play: boolean;
  min_severity: 'high' | 'critical';
  announcement_prefix: string;
  use_browser_tts: boolean;
}

export interface IncidentAlert {
  incident_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reporter: string;
  timestamp: string;
}

export interface AlertQueueItem {
  id: string;
  message: string;
  priority: number;
  created_at: string;
  played: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const defaultConfig: VoiceAlertConfig = {
  enabled: true,
  tts_endpoint: 'http://localhost:5500/v1/audio/speech',
  voice_model: 'tts-1',
  speed: 1.0,
  auto_play: true,
  min_severity: 'high',
  announcement_prefix: 'Security Alert.',
  use_browser_tts: true, // Fallback to browser speech synthesis
};

let config: VoiceAlertConfig = { ...defaultConfig };

// Alert queue
const alertQueue: AlertQueueItem[] = [];
let isPlaying = false;

/**
 * Configure the voice alert system
 */
export function configureVoiceAlerts(newConfig: Partial<VoiceAlertConfig>): void {
  config = { ...config, ...newConfig };
  console.log('[VoiceAlerts] Configuration updated:', config);
}

/**
 * Get current configuration
 */
export function getVoiceAlertConfig(): VoiceAlertConfig {
  return { ...config };
}

// ═══════════════════════════════════════════════════════════════
// ALERT GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate an alert message from an incident
 */
function generateAlertMessage(incident: IncidentAlert): string {
  const severityMap = {
    critical: 'Critical severity',
    high: 'High severity',
    medium: 'Medium severity',
    low: 'Low severity',
  };
  
  const parts = [
    config.announcement_prefix,
    severityMap[incident.severity],
    'incident detected.',
    incident.title,
    '.',
  ];
  
  // Add brief description for critical
  if (incident.severity === 'critical') {
    const briefDesc = incident.description.slice(0, 100);
    parts.push(briefDesc);
  }
  
  return parts.join(' ');
}

/**
 * Calculate alert priority (higher = more urgent)
 */
function calculatePriority(severity: string): number {
  const priorities: Record<string, number> = {
    critical: 100,
    high: 80,
    medium: 50,
    low: 20,
  };
  return priorities[severity] || 0;
}

// ═══════════════════════════════════════════════════════════════
// TTS SYNTHESIS
// ═══════════════════════════════════════════════════════════════

/**
 * Synthesize speech using OpenedAI Speech TTS
 */
async function synthesizeWithTTS(text: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(config.tts_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.voice_model,
        input: text,
        voice: 'alloy',
        speed: config.speed,
      }),
    });
    
    if (!response.ok) {
      console.error('[VoiceAlerts] TTS request failed:', response.status);
      return null;
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.error('[VoiceAlerts] TTS error:', error);
    return null;
  }
}

/**
 * Synthesize speech using browser's built-in TTS
 */
function synthesizeWithBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('Speech synthesis not available'));
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = config.speed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use a professional voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Microsoft') || 
      v.name.includes('Google') ||
      v.lang.startsWith('en-US')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Play audio from ArrayBuffer
 */
async function playAudio(audioData: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Audio playback not available on server'));
      return;
    }
    
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    audioContext.decodeAudioData(audioData, (buffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        audioContext.close();
        resolve();
      };
      source.start(0);
    }, reject);
  });
}

// ═══════════════════════════════════════════════════════════════
// QUEUE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Add an alert to the queue
 */
function enqueueAlert(message: string, priority: number): string {
  const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const item: AlertQueueItem = {
    id,
    message,
    priority,
    created_at: new Date().toISOString(),
    played: false,
  };
  
  // Insert in priority order
  const insertIndex = alertQueue.findIndex(a => a.priority < priority);
  if (insertIndex === -1) {
    alertQueue.push(item);
  } else {
    alertQueue.splice(insertIndex, 0, item);
  }
  
  console.log(`[VoiceAlerts] Alert queued: ${id} (priority: ${priority})`);
  
  // Start processing if not already
  if (!isPlaying) {
    processQueue();
  }
  
  return id;
}

/**
 * Process the alert queue
 */
async function processQueue(): Promise<void> {
  if (isPlaying || alertQueue.length === 0) {
    return;
  }
  
  isPlaying = true;
  
  while (alertQueue.length > 0) {
    const alert = alertQueue.find(a => !a.played);
    if (!alert) break;
    
    alert.played = true;
    
    try {
      console.log(`[VoiceAlerts] Playing alert: ${alert.id}`);
      
      if (config.use_browser_tts) {
        await synthesizeWithBrowser(alert.message);
      } else {
        const audioData = await synthesizeWithTTS(alert.message);
        if (audioData) {
          await playAudio(audioData);
        }
      }
      
      console.log(`[VoiceAlerts] Alert played: ${alert.id}`);
    } catch (error) {
      console.error(`[VoiceAlerts] Failed to play alert: ${alert.id}`, error);
    }
    
    // Remove played alert
    const index = alertQueue.findIndex(a => a.id === alert.id);
    if (index !== -1) {
      alertQueue.splice(index, 1);
    }
    
    // Brief pause between alerts
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  isPlaying = false;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Announce an incident via voice
 */
export async function announceIncident(incident: IncidentAlert): Promise<{
  announced: boolean;
  alert_id: string | null;
  reason: string;
}> {
  // Check if enabled
  if (!config.enabled) {
    return { announced: false, alert_id: null, reason: 'Voice alerts disabled' };
  }
  
  // Check severity threshold
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  const minSeverityIndex = severityOrder.indexOf(config.min_severity);
  const incidentSeverityIndex = severityOrder.indexOf(incident.severity);
  
  if (incidentSeverityIndex < minSeverityIndex) {
    return { 
      announced: false, 
      alert_id: null, 
      reason: `Severity ${incident.severity} below threshold ${config.min_severity}` 
    };
  }
  
  // Generate and queue alert
  const message = generateAlertMessage(incident);
  const priority = calculatePriority(incident.severity);
  const alertId = enqueueAlert(message, priority);
  
  return { announced: true, alert_id: alertId, reason: 'Alert queued' };
}

/**
 * Announce a custom message
 */
export async function announceMessage(
  message: string, 
  priority: number = 50
): Promise<string> {
  if (!config.enabled) {
    throw new Error('Voice alerts disabled');
  }
  
  return enqueueAlert(message, priority);
}

/**
 * Get queue status
 */
export function getQueueStatus(): {
  queue_length: number;
  is_playing: boolean;
  pending_alerts: AlertQueueItem[];
} {
  return {
    queue_length: alertQueue.length,
    is_playing: isPlaying,
    pending_alerts: alertQueue.filter(a => !a.played),
  };
}

/**
 * Clear all pending alerts
 */
export function clearQueue(): void {
  alertQueue.length = 0;
  console.log('[VoiceAlerts] Queue cleared');
}

/**
 * Test the voice alert system
 */
export async function testVoiceAlert(): Promise<boolean> {
  try {
    const testMessage = 'Voice alert system test. All systems operational.';
    
    if (config.use_browser_tts) {
      await synthesizeWithBrowser(testMessage);
    } else {
      const audioData = await synthesizeWithTTS(testMessage);
      if (audioData) {
        await playAudio(audioData);
      }
    }
    
    console.log('[VoiceAlerts] Test successful');
    return true;
  } catch (error) {
    console.error('[VoiceAlerts] Test failed:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// MYCA ORCHESTRATOR INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Send voice notification via MYCA orchestrator
 */
export async function notifyViaMyca(message: string): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8001/api/voice/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        priority: 'high',
        channel: 'security',
      }),
    });
    
    if (!response.ok) {
      console.error('[VoiceAlerts] MYCA notification failed:', response.status);
      return false;
    }
    
    console.log('[VoiceAlerts] MYCA notification sent');
    return true;
  } catch (error) {
    console.error('[VoiceAlerts] MYCA notification error:', error);
    return false;
  }
}

/**
 * Initialize voice alert system with MYCA
 */
export async function initializeWithMyca(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8001/api/voice/status');
    
    if (!response.ok) {
      console.warn('[VoiceAlerts] MYCA voice service not available');
      return false;
    }
    
    console.log('[VoiceAlerts] MYCA voice service connected');
    return true;
  } catch {
    console.warn('[VoiceAlerts] MYCA voice service not reachable');
    return false;
  }
}
