import { NextResponse } from 'next/server';
import { resolveMasServerBaseUrl } from '@/lib/mas-server-url';
import { resolveMindexServerBaseUrl } from '@/lib/mindex-base-url';

const MINDEX_BASE_URL = resolveMindexServerBaseUrl();
const MAS_BASE_URL = resolveMasServerBaseUrl();
const NLM_BASE_URL = (
  process.env.NLM_API_URL ||
  process.env.NLM_API_BASE_URL ||
  'http://192.168.0.188:8200'
).replace(/\/$/, '');
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || 'local-dev-key';

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

async function getJson(baseUrl: string, paths: string[], timeoutMs = 5000, headers?: HeadersInit) {
  const base = baseUrl.replace(/\/$/, '');

  for (const path of paths) {
    try {
      const response = await fetch(`${base}${path}`, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      });

      if (!response.ok) continue;
      return await response.json();
    } catch {
      // Try the next known service endpoint.
    }
  }

  return null;
}

function normalizeRunId(value: any) {
  return value?.run_id || value?.runId || value?.id || null;
}

function normalizeTrainingStatus(trainingRuns: any, standaloneTraining: any) {
  const activeRunId = trainingRuns?.active_run_id || null;
  const activeRun = Array.isArray(trainingRuns?.runs)
    ? trainingRuns.runs.find((run: any) => normalizeRunId(run) === activeRunId) || trainingRuns.runs[0]
    : null;
  const latest = standaloneTraining?.latest || null;

  if (activeRun) {
    const metrics = activeRun.metrics || {};
    return {
      status: activeRun.status || 'queued',
      runId: normalizeRunId(activeRun),
      epoch: activeRun.current_epoch ?? latest?.epoch ?? 0,
      totalEpochs: activeRun.total_epochs ?? activeRun.config?.epochs ?? latest?.total_epochs ?? 0,
      loss: metrics.loss ?? latest?.loss ?? null,
      accuracy: metrics.accuracy ?? latest?.accuracy ?? null,
      learningRate: activeRun.config?.learning_rate ?? latest?.learning_rate ?? null,
      samplesProcessed: metrics.samples_processed ?? latest?.signal_samples ?? 0,
      gradientNorm: metrics.gradient_norm ?? null,
      elapsedTime: metrics.elapsed_seconds ?? 0,
      startedAt: activeRun.started_at || null,
      lossHistory: metrics.loss_history || standaloneTraining?.history?.map((row: any) => row.loss).filter(Number.isFinite) || [],
      accuracyHistory: metrics.accuracy_history || standaloneTraining?.history?.map((row: any) => row.accuracy).filter(Number.isFinite) || [],
    };
  }

  if (latest) {
    return {
      status: latest.status || 'waiting',
      runId: null,
      epoch: latest.epoch ?? 0,
      totalEpochs: 100,
      loss: latest.loss ?? null,
      accuracy: latest.accuracy ?? null,
      learningRate: latest.learning_rate ?? null,
      samplesProcessed: latest.signal_samples ?? 0,
      gradientNorm: null,
      elapsedTime: 0,
      startedAt: null,
      lossHistory: standaloneTraining?.history?.map((row: any) => row.loss).filter(Number.isFinite) || [],
      accuracyHistory: standaloneTraining?.history?.map((row: any) => row.accuracy).filter(Number.isFinite) || [],
    };
  }

  return {
    status: 'idle',
    runId: null,
    epoch: 0,
    totalEpochs: 0,
    loss: null,
    accuracy: null,
    learningRate: null,
    samplesProcessed: 0,
    gradientNorm: null,
    elapsedTime: 0,
    startedAt: null,
    lossHistory: [],
    accuracyHistory: [],
  };
}

export async function GET() {
  const now = new Date().toISOString();

  const [mindex, standaloneTraining] = await Promise.all([
    getJson(MINDEX_BASE_URL, ['/api/mindex/health', '/health'], 5000, {
      'X-API-Key': MINDEX_API_KEY,
      Accept: 'application/json',
    }),
    getJson(NLM_BASE_URL, ['/api/training/status'], 3000),
  ]);

  // MAS can be single-worker or temporarily slow after restarts, so avoid
  // fanning out several long-running probes at once.
  const trainingRuns = await getJson(MAS_BASE_URL, ['/api/nlm/training/runs'], 15000);
  const checkpoints = await getJson(MAS_BASE_URL, ['/api/nlm/training/checkpoints'], 15000);
  const nlmHealth = await getJson(MAS_BASE_URL, ['/api/nlm/health'], 15000);
  const nlmModelStatus = await getJson(MAS_BASE_URL, ['/api/nlm/model/status', '/api/nlm/model/info'], 15000);
  const masHealth = await getJson(MAS_BASE_URL, ['/api/myca/status', '/health'], 15000);

  const training = normalizeTrainingStatus(trainingRuns, standaloneTraining);
  const masOnline = Boolean(masHealth);
  const nlmOnline = Boolean(nlmHealth || nlmModelStatus);
  const rawNlmStatus = String(nlmHealth?.status || nlmModelStatus?.status || '').toLowerCase();
  const nlmStatus =
    rawNlmStatus === 'degraded' || rawNlmStatus === 'unhealthy' || rawNlmStatus === 'not_loaded'
      ? 'degraded'
      : nlmOnline
        ? 'online'
        : 'offline';

  return NextResponse.json({
    training,
    model: {
      health: {
        status: nlmStatus,
        model_loaded: Boolean(nlmHealth?.model_loaded),
        model_name: nlmHealth?.model_name || nlmModelStatus?.model_name || 'NLM',
        model_version: nlmHealth?.model_version || nlmModelStatus?.model_version || '0.1.0',
      },
      info: nlmModelStatus || {},
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
      name: masHealth?.gpu?.name || 'NLM Compute Cluster',
      memoryUsed: masHealth?.gpu?.memoryUsed ?? 0,
      memoryTotal: masHealth?.gpu?.memoryTotal ?? 0,
      memoryPercent: masHealth?.gpu?.memoryPercent ?? 0,
      utilization: masHealth?.gpu?.utilization ?? 0,
      temperature: masHealth?.gpu?.temperature ?? 0,
      powerDraw: masHealth?.gpu?.powerDraw ?? 0,
    },
    gpuContainers: masHealth?.containers || [],
    devices: masHealth?.devices || [],
    deviceCount: masHealth?.deviceCount ?? 0,
    checkpoints: checkpoints?.checkpoints || [],
    dataStats: {
      mindexSpecies: mindex?.species_count ?? mindex?.count ?? 0,
      mindexTaxonomicMatches: mindex?.taxonomic_matches ?? 0,
    },
    connections: {
      mas: masOnline,
      mindex: !!mindex,
      gpu: !!(masHealth?.gpu),
      mycobrain: masOnline,
      nlm: nlmOnline,
    },
    mindexStatus: mindex ? {
      status: mindex.status,
      version: mindex.version,
      species_count: mindex.species_count,
    } : null,
    masStatus: masHealth ? {
      status: masHealth.status || masHealth.state,
      version: masHealth.version,
      fallback: masHealth.fallback,
    } : null,
    nlmStatus: nlmHealth,
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

    const requestBody = action === 'start'
      ? {
          ...body,
          learning_rate: body.learning_rate ?? body.hyperparameters?.learningRate,
          batch_size: body.batch_size ?? body.hyperparameters?.batchSize,
          epochs: body.epochs ?? body.hyperparameters?.epochs,
          categories: body.categories ?? [body.dataSource].filter(Boolean),
        }
      : {
          run_id: body.run_id || body.masRunId || body.runId || null,
        };

    const masRes = await fetch(`${MAS_BASE_URL}/api/nlm/training/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(12000),
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

    return NextResponse.json({
      success: true,
      action,
      data: {
        ...data,
        runId: data?.run_id || data?.runId || data?.taskId,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
