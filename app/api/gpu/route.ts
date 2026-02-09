/**
 * Local GPU Services API Route - February 5, 2026
 * Proxies requests to local GPU services (RTX 5090)
 */

import { NextRequest, NextResponse } from 'next/server';

const GPU_GATEWAY_URL = process.env.LOCAL_GPU_GATEWAY || 'http://localhost:8300';
const EARTH2_URL = process.env.LOCAL_EARTH2_URL || 'http://localhost:8220';
const VOICE_BRIDGE_URL = process.env.LOCAL_BRIDGE_URL || 'http://localhost:8999';
const USE_LOCAL_GPU = process.env.NEXT_PUBLIC_USE_LOCAL_GPU === 'true';

// GET /api/gpu - Gateway status
export async function GET(request: NextRequest) {
  if (!USE_LOCAL_GPU) {
    return NextResponse.json({
      enabled: false,
      message: 'Local GPU services not enabled. Set NEXT_PUBLIC_USE_LOCAL_GPU=true',
    });
  }

  try {
    // Check gateway
    const gatewayResponse = await fetch(`${GPU_GATEWAY_URL}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!gatewayResponse.ok) {
      throw new Error('Gateway not responding');
    }

    const gatewayData = await gatewayResponse.json();

    // Check GPU status
    const gpuResponse = await fetch(`${EARTH2_URL}/gpu/status`);
    const gpuData = gpuResponse.ok ? await gpuResponse.json() : { available: false };

    // Check voice bridge
    const voiceResponse = await fetch(`${VOICE_BRIDGE_URL}/health`);
    const voiceData = voiceResponse.ok ? await voiceResponse.json() : { status: 'offline' };

    return NextResponse.json({
      enabled: true,
      gateway: gatewayData,
      gpu: gpuData,
      voice: voiceData,
      endpoints: {
        gateway: GPU_GATEWAY_URL,
        earth2: EARTH2_URL,
        voice: VOICE_BRIDGE_URL,
        moshi: 'ws://localhost:8998/api/chat',
      },
    });
  } catch (error) {
    return NextResponse.json({
      enabled: true,
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to connect to local GPU services',
      hint: 'Start GPU services with: START_LOCAL_GPU.bat',
    }, { status: 503 });
  }
}

// POST /api/gpu - Proxy to GPU gateway
export async function POST(request: NextRequest) {
  if (!USE_LOCAL_GPU) {
    return NextResponse.json({
      error: 'Local GPU services not enabled',
    }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { service, action, ...params } = body;

    let targetUrl: string;
    let method = 'POST';

    switch (service) {
      case 'earth2':
        switch (action) {
          case 'models':
            targetUrl = `${EARTH2_URL}/models`;
            method = 'GET';
            break;
          case 'load':
            targetUrl = `${EARTH2_URL}/models/${params.model}/load`;
            break;
          case 'unload':
            targetUrl = `${EARTH2_URL}/models/${params.model}/unload`;
            break;
          case 'inference':
            targetUrl = `${EARTH2_URL}/inference`;
            break;
          default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
        break;

      case 'voice':
        switch (action) {
          case 'session':
            targetUrl = `${VOICE_BRIDGE_URL}/session`;
            break;
          case 'health':
            targetUrl = `${VOICE_BRIDGE_URL}/health`;
            method = 'GET';
            break;
          default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
        break;

      default:
        return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
    }

    const response = await fetch(targetUrl, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      body: method === 'POST' ? JSON.stringify(params) : undefined,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Request failed',
    }, { status: 500 });
  }
}
