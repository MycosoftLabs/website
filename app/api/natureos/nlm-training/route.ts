import { NextResponse } from 'next/server';

const MINDEX_BASE_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL;
const MAS_BASE_URL = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL;

export const revalidate = 0;

const TRAINING_ACTIONS = new Set(['start', 'stop', 'pause', 'resume']);

async function readServiceResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function GET() {
  const now = new Date().toISOString();

  const [mindexHealth, masHealth] = await Promise.allSettled([
    MINDEX_BASE_URL
      ? fetch(`${MINDEX_BASE_URL}/health`, { signal: AbortSignal.timeout(3000), cache: 'no-store' }).then(r => r.json())
      : Promise.reject(new Error('not configured')),
    MAS_BASE_URL
      ? fetch(`${MAS_BASE_URL}/health`, { signal: AbortSignal.timeout(3000), cache: 'no-store' }).then(r => r.json())
      : Promise.reject(new Error('not configured')),
  ]);

  const mindex = mindexHealth.status === 'fulfilled' ? mindexHealth.value : null;
  const mas = masHealth.status === 'fulfilled' ? masHealth.value : null;

  return NextResponse.json({
    training: {
      status: 'idle',
      runId: null,
      epoch: 0,
      totalEpochs: 100,
      loss: null,
      accuracy: null,
      learningRate: 0.0001,
      samplesProcessed: mindex?.species_count ?? 0,
      gradientNorm: null,
      elapsedTime: 0,
      startedAt: null,
      lossHistory: [],
      accuracyHistory: [],
    },
    model: {
      health: {
        status: mas ? 'online' : 'offline',
        model_loaded: !!mas,
        model_name: mas?.service || 'NLM-v3',
        model_version: mas?.version || '3.0.0',
      },
      info: {},
      architecture: {
        baseModel: 'Mamba-Graph-Hybrid',
        hiddenSize: 512,
        numLayers: 12,
        numAttentionHeads: 8,
        vocabSize: 50000,
        maxPositionEmbeddings: 4096,
        useLora: true,
        loraR: 8,
        loraAlpha: 16,
      },
      hyperparameters: {},
    },
    gpu: {
      name: mas?.gpu?.name || 'NLM Compute Cluster',
      memoryUsed: mas?.gpu?.memoryUsed ?? 0,
      memoryTotal: mas?.gpu?.memoryTotal ?? 0,
      memoryPercent: mas?.gpu?.memoryPercent ?? 0,
      utilization: mas?.gpu?.utilization ?? 0,
      temperature: mas?.gpu?.temperature ?? 0,
      powerDraw: mas?.gpu?.powerDraw ?? 0,
    },
    gpuContainers: mas?.containers || [],
    devices: mas?.devices || [],
    deviceCount: mas?.deviceCount ?? 0,
    checkpoints: [],
    dataStats: {
      mindexSpecies: mindex?.species_count ?? 0,
      mindexTaxonomicMatches: mindex?.taxonomic_matches ?? 0,
    },
    connections: {
      mas: !!mas,
      mindex: !!mindex,
      gpu: !!(mas?.gpu),
      mycobrain: !!mas,
    },
    mindexStatus: mindex ? {
      status: mindex.status,
      version: mindex.version,
      species_count: mindex.species_count,
    } : null,
    masStatus: mas ? {
      status: mas.status,
      version: mas.version,
      fallback: mas.fallback,
    } : null,
    timestamp: now,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!TRAINING_ACTIONS.has(action)) {
      return NextResponse.json({ success: false, error: 'Unsupported training action' }, { status: 400 });
    }

    if (!MAS_BASE_URL) {
      return NextResponse.json({ success: false, error: 'MAS_API_URL is not configured' }, { status: 503 });
    }

    const masRes = await fetch(`${MAS_BASE_URL}/training/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await readServiceResponse(masRes);

    if (!masRes.ok) {
      return NextResponse.json(
        {
          success: false,
          action,
          error: data?.error || data?.message || `MAS rejected ${action}`,
          data,
        },
        { status: masRes.status },
      );
    }

    return NextResponse.json({ success: true, action, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
