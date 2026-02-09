/**
 * Local GPU Services Hook - February 5, 2026
 * Provides access to local GPU services (RTX 5090) for the dev server
 * 
 * Services:
 * - Earth2Studio (weather AI models)
 * - PersonaPlex (voice AI)
 * - GPU Gateway (unified access)
 */

import { useState, useEffect, useCallback } from 'react';

// Environment configuration
const GPU_GATEWAY_URL = process.env.NEXT_PUBLIC_GPU_GATEWAY_URL || 'http://localhost:8300';
const EARTH2_URL = process.env.NEXT_PUBLIC_EARTH2_URL || 'http://localhost:8220';
const VOICE_BRIDGE_URL = process.env.NEXT_PUBLIC_VOICE_BRIDGE_URL || 'http://localhost:8999';
const MOSHI_URL = process.env.NEXT_PUBLIC_MOSHI_URL || 'ws://localhost:8998';
const USE_LOCAL_GPU = process.env.NEXT_PUBLIC_USE_LOCAL_GPU === 'true';

// Types
interface GPUStatus {
  available: boolean;
  name?: string;
  memory_gb?: number;
  allocated_memory_gb?: number;
  cuda_version?: string;
}

interface ServiceStatus {
  name: string;
  port: number;
  url: string;
  running: boolean;
}

interface GatewayStatus {
  gateway: string;
  version: string;
  timestamp: string;
  gpu: GPUStatus;
  services: Record<string, ServiceStatus>;
  dev_server: string;
}

interface Earth2Model {
  name: string;
  description: string;
  supported_variables: string[];
  max_lead_time: number;
  loaded: boolean;
}

interface Earth2InferenceRequest {
  model: string;
  lead_time?: number;
  initial_time?: string;
  variables?: string[];
}

interface Earth2InferenceResponse {
  model: string;
  lead_time: number;
  initial_time: string;
  status: string;
  forecast_id: string;
  message: string;
}

// Hook: useLocalGPU
export function useLocalGPU() {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check gateway health
  const checkGateway = useCallback(async () => {
    if (!USE_LOCAL_GPU) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${GPU_GATEWAY_URL}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setGatewayStatus(data);
        setIsConnected(true);
        setError(null);
      } else {
        throw new Error(`Gateway returned ${response.status}`);
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Failed to connect to GPU gateway');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check on mount and periodically
  useEffect(() => {
    checkGateway();
    
    // Poll every 30 seconds
    const interval = setInterval(checkGateway, 30000);
    return () => clearInterval(interval);
  }, [checkGateway]);

  return {
    isEnabled: USE_LOCAL_GPU,
    isConnected,
    isLoading,
    error,
    gatewayStatus,
    checkGateway,
    urls: {
      gateway: GPU_GATEWAY_URL,
      earth2: EARTH2_URL,
      voiceBridge: VOICE_BRIDGE_URL,
      moshi: MOSHI_URL,
    },
  };
}

// Hook: useEarth2
export function useEarth2() {
  const [models, setModels] = useState<Earth2Model[]>([]);
  const [gpuStatus, setGpuStatus] = useState<GPUStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available models
  const fetchModels = useCallback(async () => {
    if (!USE_LOCAL_GPU) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${EARTH2_URL}/models`);
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch GPU status
  const fetchGPUStatus = useCallback(async () => {
    if (!USE_LOCAL_GPU) return;

    try {
      const response = await fetch(`${EARTH2_URL}/gpu/status`);
      if (response.ok) {
        const data = await response.json();
        setGpuStatus(data);
      }
    } catch (err) {
      // Silently fail for status check
    }
  }, []);

  // Load a model
  const loadModel = useCallback(async (modelName: string) => {
    if (!USE_LOCAL_GPU) throw new Error('Local GPU not enabled');

    const response = await fetch(`${EARTH2_URL}/models/${modelName}/load`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }

    await fetchModels(); // Refresh models list
    return response.json();
  }, [fetchModels]);

  // Unload a model
  const unloadModel = useCallback(async (modelName: string) => {
    if (!USE_LOCAL_GPU) throw new Error('Local GPU not enabled');

    const response = await fetch(`${EARTH2_URL}/models/${modelName}/unload`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to unload model: ${response.statusText}`);
    }

    await fetchModels(); // Refresh models list
    return response.json();
  }, [fetchModels]);

  // Run inference
  const runInference = useCallback(async (request: Earth2InferenceRequest): Promise<Earth2InferenceResponse> => {
    if (!USE_LOCAL_GPU) throw new Error('Local GPU not enabled');

    const response = await fetch(`${EARTH2_URL}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Inference failed: ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Initialize
  useEffect(() => {
    fetchModels();
    fetchGPUStatus();
    
    // Poll GPU status every 10 seconds
    const interval = setInterval(fetchGPUStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchModels, fetchGPUStatus]);

  return {
    isEnabled: USE_LOCAL_GPU,
    models,
    gpuStatus,
    isLoading,
    error,
    loadModel,
    unloadModel,
    runInference,
    refresh: fetchModels,
  };
}

// Hook: useVoiceBridge
export function useVoiceBridge() {
  const [bridgeHealth, setBridgeHealth] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check bridge health
  const checkHealth = useCallback(async () => {
    if (!USE_LOCAL_GPU) return;

    try {
      const response = await fetch(`${VOICE_BRIDGE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setBridgeHealth(data);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Failed to connect to voice bridge');
    }
  }, []);

  // Create a voice session
  const createSession = useCallback(async (): Promise<string> => {
    if (!USE_LOCAL_GPU) throw new Error('Local GPU not enabled');

    const response = await fetch(`${VOICE_BRIDGE_URL}/session`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const data = await response.json();
    setSessionId(data.session_id);
    return data.session_id;
  }, []);

  // Get WebSocket URL for a session
  const getWebSocketUrl = useCallback((session: string): string => {
    return `ws://localhost:8999/ws/${session}`;
  }, []);

  // Get direct Moshi URL
  const getMoshiUrl = useCallback((): string => {
    return `${MOSHI_URL}/api/chat`;
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    isEnabled: USE_LOCAL_GPU,
    isConnected,
    bridgeHealth,
    sessionId,
    error,
    createSession,
    getWebSocketUrl,
    getMoshiUrl,
    refresh: checkHealth,
  };
}

// Combined hook for all GPU services
export function useGPUServices() {
  const localGPU = useLocalGPU();
  const earth2 = useEarth2();
  const voiceBridge = useVoiceBridge();

  return {
    isEnabled: USE_LOCAL_GPU,
    isReady: localGPU.isConnected && !localGPU.isLoading,
    gateway: localGPU,
    earth2,
    voice: voiceBridge,
  };
}

export default useGPUServices;
