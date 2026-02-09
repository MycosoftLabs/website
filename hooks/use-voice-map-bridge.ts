/**
 * Voice-Map-Earth2 WebSocket Bridge Hook - February 5, 2026
 * 
 * Provides unified voice control for:
 * - Map navigation (zoom, pan, fly-to)
 * - Earth2 weather layers
 * - CREP data filtering and queries
 * 
 * Integrates PersonaPlex voice AI with MapLibre GL and Earth2Studio.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

// Environment configuration
const VOICE_BRIDGE_URL = process.env.NEXT_PUBLIC_VOICE_BRIDGE_URL || 'http://localhost:8999';
const GPU_GATEWAY_URL = process.env.NEXT_PUBLIC_GPU_GATEWAY_URL || 'http://localhost:8300';
const MOSHI_URL = process.env.NEXT_PUBLIC_MOSHI_URL || 'ws://localhost:8998';
const USE_LOCAL_GPU = process.env.NEXT_PUBLIC_USE_LOCAL_GPU === 'true';

// Types
export interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  bounds?: [[number, number], [number, number]];
}

export interface Earth2State {
  activeModel: string | null;
  activeLayers: string[];
  lastForecast: any | null;
  gpuMemoryUsed: number;
}

export interface VoiceCommand {
  domain: 'earth2' | 'map' | 'crep' | 'system' | 'general';
  action: string;
  speak?: string;
  frontendCommand?: FrontendCommand;
  needsLLMResponse?: boolean;
  error?: string;
  rawText: string;
}

export interface FrontendCommand {
  type: string;
  center?: [number, number];
  zoom?: number;
  duration?: number;
  delta?: number;
  offset?: [number, number];
  layer?: string;
  query?: string;
  filterType?: string;
  filterValue?: string;
  model?: string;
  leadTime?: number;
}

export interface VoiceBridgeCallbacks {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onCommand?: (command: VoiceCommand) => void;
  onSpeaking?: (text: string) => void;
  onError?: (error: string) => void;
  onMapCommand?: (command: FrontendCommand) => void;
  onEarth2Command?: (command: FrontendCommand) => void;
}

export interface VoiceMapBridgeState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentTranscript: string;
  lastCommand: VoiceCommand | null;
  mapState: MapState | null;
  earth2State: Earth2State | null;
  error: string | null;
}

/**
 * Main hook for voice-controlled map and Earth2 interaction
 */
export function useVoiceMapBridge(
  callbacks?: VoiceBridgeCallbacks
) {
  // State
  const [state, setState] = useState<VoiceMapBridgeState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    currentTranscript: '',
    lastCommand: null,
    mapState: null,
    earth2State: null,
    error: null,
  });
  
  // Refs for WebSocket and map
  const wsRef = useRef<WebSocket | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbacksRef = useRef(callbacks);
  
  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);
  
  // Update map state periodically
  const updateMapState = useCallback(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    const center = map.getCenter();
    const bounds = map.getBounds();
    
    const mapState: MapState = {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      bounds: [
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getEast(), bounds.getNorth()]
      ],
    };
    
    setState(prev => ({ ...prev, mapState }));
    return mapState;
  }, []);
  
  // Execute frontend commands on the map
  const executeMapCommand = useCallback((command: FrontendCommand) => {
    if (!mapRef.current) {
      console.warn('Map not connected, cannot execute command:', command);
      return;
    }
    
    const map = mapRef.current;
    
    switch (command.type) {
      case 'flyTo':
        if (command.center) {
          map.flyTo({
            center: command.center,
            zoom: command.zoom || map.getZoom(),
            duration: command.duration || 2000,
          });
        }
        break;
        
      case 'geocodeAndFlyTo':
        // This requires external geocoding - emit callback
        callbacksRef.current?.onMapCommand?.(command);
        break;
        
      case 'setZoom':
        if (command.zoom !== undefined) {
          map.easeTo({
            zoom: command.zoom,
            duration: command.duration || 500,
          });
        }
        break;
        
      case 'zoomBy':
        if (command.delta !== undefined) {
          const newZoom = map.getZoom() + command.delta;
          map.easeTo({
            zoom: Math.max(0, Math.min(22, newZoom)),
            duration: command.duration || 500,
          });
        }
        break;
        
      case 'panBy':
        if (command.offset) {
          map.panBy(command.offset, {
            duration: command.duration || 300,
          });
        }
        break;
        
      case 'showLayer':
      case 'hideLayer':
      case 'toggleLayer':
        // Layer control - emit to callback for component handling
        callbacksRef.current?.onMapCommand?.(command);
        break;
        
      case 'applyFilter':
      case 'clearFilters':
        // CREP filters - emit to callback
        callbacksRef.current?.onMapCommand?.(command);
        break;
        
      case 'getViewContext':
      case 'getEntityDetails':
        // Query commands - emit to callback
        callbacksRef.current?.onMapCommand?.(command);
        break;
        
      default:
        console.warn('Unknown map command type:', command.type);
    }
    
    // Update state after command
    setTimeout(updateMapState, 100);
  }, [updateMapState]);
  
  // Execute Earth2 commands
  const executeEarth2Command = useCallback(async (command: FrontendCommand) => {
    callbacksRef.current?.onEarth2Command?.(command);
    
    // Execute known commands locally
    switch (command.type) {
      case 'runForecast':
        try {
          const response = await fetch(`${GPU_GATEWAY_URL}/earth2/inference`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: command.model || 'fcn',
              lead_time: command.leadTime || 24,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setState(prev => ({
              ...prev,
              earth2State: {
                ...prev.earth2State!,
                lastForecast: data,
              }
            }));
          }
        } catch (err) {
          console.error('Earth2 forecast failed:', err);
        }
        break;
        
      case 'loadModel':
        try {
          await fetch(`${GPU_GATEWAY_URL}/earth2/models/${command.model}/load`, {
            method: 'POST',
          });
          setState(prev => ({
            ...prev,
            earth2State: {
              ...prev.earth2State!,
              activeModel: command.model || null,
            }
          }));
        } catch (err) {
          console.error('Failed to load model:', err);
        }
        break;
    }
  }, []);
  
  // Process voice command from backend
  const processVoiceCommand = useCallback((command: VoiceCommand) => {
    setState(prev => ({ ...prev, lastCommand: command }));
    callbacksRef.current?.onCommand?.(command);
    
    if (command.frontendCommand) {
      if (command.domain === 'map' || command.domain === 'crep') {
        executeMapCommand(command.frontendCommand);
      } else if (command.domain === 'earth2') {
        executeEarth2Command(command.frontendCommand);
      }
    }
    
    // Speak response if available
    if (command.speak) {
      callbacksRef.current?.onSpeaking?.(command.speak);
    }
  }, [executeMapCommand, executeEarth2Command]);
  
  // Send context to voice bridge
  const sendContext = useCallback(async () => {
    if (!sessionIdRef.current) return;
    
    const mapState = updateMapState();
    
    try {
      await fetch(`${VOICE_BRIDGE_URL}/session/${sessionIdRef.current}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          map: mapState,
          earth2: state.earth2State,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to send context:', err);
    }
  }, [updateMapState, state.earth2State]);
  
  // Route voice command through backend
  const routeVoiceCommand = useCallback(async (text: string) => {
    try {
      const response = await fetch(`${GPU_GATEWAY_URL}/voice/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          context: {
            map: state.mapState,
            earth2: state.earth2State,
          }
        }),
      });
      
      if (response.ok) {
        const command = await response.json();
        processVoiceCommand(command);
        return command;
      }
    } catch (err) {
      console.error('Voice routing failed:', err);
    }
    
    return null;
  }, [state.mapState, state.earth2State, processVoiceCommand]);
  
  // Create voice session
  const createSession = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(`${VOICE_BRIDGE_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enable_earth2: true,
          enable_map: true,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        sessionIdRef.current = data.session_id;
        return data.session_id;
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
    
    return null;
  }, []);
  
  // Connect to voice WebSocket
  const connect = useCallback(async () => {
    if (!USE_LOCAL_GPU) {
      setState(prev => ({ ...prev, error: 'Local GPU not enabled' }));
      return false;
    }
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Create session first
    let sessionId = sessionIdRef.current;
    if (!sessionId) {
      sessionId = await createSession();
    }
    
    if (!sessionId) {
      setState(prev => ({ ...prev, error: 'Failed to create voice session' }));
      return false;
    }
    
    // Connect to WebSocket
    const wsUrl = `ws://localhost:8999/ws/${sessionId}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Voice bridge connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
        
        // Send initial context
        sendContext();
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'transcript':
              setState(prev => ({
                ...prev,
                currentTranscript: data.text,
              }));
              callbacksRef.current?.onTranscript?.(data.text, data.is_final);
              
              // Route command on final transcript
              if (data.is_final) {
                routeVoiceCommand(data.text);
              }
              break;
              
            case 'command':
              processVoiceCommand(data.command);
              break;
              
            case 'speaking':
              setState(prev => ({ ...prev, isSpeaking: data.active }));
              if (data.text) {
                callbacksRef.current?.onSpeaking?.(data.text);
              }
              break;
              
            case 'error':
              setState(prev => ({ ...prev, error: data.message }));
              callbacksRef.current?.onError?.(data.message);
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onclose = () => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isListening: false,
        }));
        
        // Attempt reconnection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (USE_LOCAL_GPU) {
            connect();
          }
        }, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
        }));
      };
      
      wsRef.current = ws;
      return true;
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Connection failed',
      }));
      return false;
    }
  }, [createSession, sendContext, routeVoiceCommand, processVoiceCommand]);
  
  // Disconnect from voice
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    sessionIdRef.current = null;
    setState(prev => ({
      ...prev,
      isConnected: false,
      isListening: false,
    }));
  }, []);
  
  // Start listening for voice
  const startListening = useCallback(async () => {
    if (!state.isConnected) {
      const connected = await connect();
      if (!connected) return false;
    }
    
    // Initialize audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    
    // Send start command
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_listening' }));
      setState(prev => ({ ...prev, isListening: true }));
      
      // Send context update
      sendContext();
      return true;
    }
    
    return false;
  }, [state.isConnected, connect, sendContext]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_listening' }));
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);
  
  // Send audio data to voice bridge
  const sendAudio = useCallback((audioData: Float32Array | Int16Array) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && state.isListening) {
      // Convert to base64 if needed
      const buffer = audioData instanceof Float32Array
        ? new Int16Array(audioData.map(f => Math.max(-32768, Math.min(32767, f * 32768))))
        : audioData;
      
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer.buffer)));
      
      wsRef.current.send(JSON.stringify({
        type: 'audio',
        data: base64,
      }));
    }
  }, [state.isListening]);
  
  // Send text command directly (for testing or text input)
  const sendTextCommand = useCallback(async (text: string) => {
    return routeVoiceCommand(text);
  }, [routeVoiceCommand]);
  
  // Set map reference
  const setMap = useCallback((map: MapLibreMap | null) => {
    mapRef.current = map;
    if (map) {
      updateMapState();
      
      // Listen for map changes
      map.on('moveend', updateMapState);
      map.on('zoomend', updateMapState);
    }
  }, [updateMapState]);
  
  // Update Earth2 state
  const setEarth2State = useCallback((earth2State: Earth2State) => {
    setState(prev => ({ ...prev, earth2State }));
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [disconnect]);
  
  return {
    // State
    ...state,
    isEnabled: USE_LOCAL_GPU,
    
    // Connection
    connect,
    disconnect,
    
    // Voice control
    startListening,
    stopListening,
    sendAudio,
    sendTextCommand,
    
    // Map integration
    setMap,
    updateMapState,
    executeMapCommand,
    
    // Earth2 integration
    setEarth2State,
    executeEarth2Command,
    
    // Context
    sendContext,
  };
}

/**
 * Simplified hook just for sending voice commands (text-based)
 */
export function useVoiceCommands() {
  const routeCommand = useCallback(async (text: string): Promise<VoiceCommand | null> => {
    if (!USE_LOCAL_GPU) return null;
    
    try {
      const response = await fetch(`${GPU_GATEWAY_URL}/voice/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (response.ok) {
        return response.json();
      }
    } catch (err) {
      console.error('Voice routing failed:', err);
    }
    
    return null;
  }, []);
  
  return {
    isEnabled: USE_LOCAL_GPU,
    routeCommand,
  };
}

export default useVoiceMapBridge;
