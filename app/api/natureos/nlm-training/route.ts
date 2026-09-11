import { NextResponse } from 'next/server';
import { resolveMasServerBaseUrl } from '@/lib/mas-server-url';
import { resolveMindexServerBaseUrl } from '@/lib/mindex-base-url';
import {
  masServiceHeaders,
  requireOwnerOrSuperuserIdentity,
  resolveVerifiedIdentity,
} from '@/lib/auth/verified-identity';
import { fetchMasNlmConsole, mindexServiceHeaders } from '@/lib/nlm/mas-nlm-live';

const MINDEX_BASE_URL = resolveMindexServerBaseUrl();
const MAS_BASE_URL = resolveMasServerBaseUrl();

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

function runTimestamp(run: any) {
  const value = run?.updated_at || run?.completed_at || run?.started_at || run?.created_at || 0;
  const parsed = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTrainingStatus(trainingRuns: any, standaloneTraining: any) {
  const activeRunId = trainingRuns?.active_run_id || null;
  const runs = Array.isArray(trainingRuns?.runs) ? trainingRuns.runs : [];
  const latestRun = [...runs].sort((a: any, b: any) => runTimestamp(b) - runTimestamp(a))[0] || null;
  const activeRun = activeRunId
    ? runs.find((run: any) => normalizeRunId(run) === activeRunId) || latestRun
    : latestRun;
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
  const identity = await resolveVerifiedIdentity();
  const serviceHeaders = masServiceHeaders({}, identity);

  const consolePayload = await fetchMasNlmConsole();
  const [mindexHealth, nlmHealth, nlmModelInfo, masReachable] = await Promise.all([
    getJson(MINDEX_BASE_URL, ['/api/mindex/health', '/health'], 5000, mindexServiceHeaders()),
    getJson(MAS_BASE_URL, ['/api/nlm/health'], 12000, serviceHeaders),
    getJson(MAS_BASE_URL, ['/api/nlm/model/info'], 12000, serviceHeaders),
    getJson(MAS_BASE_URL, ['/health', '/api/myca/status'], 12000, serviceHeaders),
  ]);

  const nlm = consolePayload?.nlm || nlmHealth || {};
  const masOnline = Boolean(consolePayload?.mas?.reachable || masReachable);
  const nlmLoaded = Boolean(nlm.model_loaded);
  const nlmOnline = nlmLoaded || Boolean(nlmHealth);
  const trainingRuns = {
    runs: consolePayload?.training?.runs || [],
    active_run_id: consolePayload?.training?.active_run_id || null,
  };
  const training = normalizeTrainingStatus(trainingRuns, null);
  const taxaCount = consolePayload?.mindex?.taxa_count ?? mindexHealth?.species_count ?? mindexHealth?.count ?? 0;

  return NextResponse.json({
    training: {
      ...training,
      jobs_available: false,
      reason: consolePayload?.training?.reason ||
        'Training compute is fail-closed on MAS 188. Catalogs and the loaded NLM remain available.',
    },
    model: {
      health: {
        status: nlmLoaded ? 'online' : nlmOnline ? 'unloaded' : 'offline',
        model_loaded: nlmLoaded,
        model_name: nlm.model_name || nlmModelInfo?.name || 'nlm',
        model_version: nlm.model_version || nlmModelInfo?.version || '0.1.0',
        bound_to_ollama: false,
        forecast_qualified: false,
        forecast_p: null,
        qualification_status: nlm.qualification_status || 'unqualified',
      },
      info: nlmModelInfo || {},
      architecture: {
        baseModel: nlm.architecture_family || nlmModelInfo?.base_model || 'native',
        hiddenSize: null,
        numLayers: null,
        numAttentionHeads: null,
      },
      hyperparameters: {},
    },
    gpu: {
      name: 'GPU Legion (fail-closed)',
      jobs_available: false,
    },
    gpuContainers: [],
    devices: [],
    deviceCount: 0,
    checkpoints: consolePayload?.checkpoints || [],
    weights: consolePayload?.weights || [],
    weight_count: consolePayload?.weight_count || (consolePayload?.weights || []).length,
    weight_home: consolePayload?.weight_home || null,
    dataStats: {
      mindexSpecies: taxaCount,
      mindexObservations: consolePayload?.mindex?.observation_count ?? 0,
      mindexCompounds: consolePayload?.mindex?.compound_count ?? 0,
    },
    connections: {
      mas: masOnline,
      mindex: Boolean(consolePayload?.mindex?.reachable || mindexHealth),
      gpu: false,
      mycobrain: masOnline,
      nlm: nlmOnline,
    },
    mindexStatus: {
      status: consolePayload?.mindex?.reachable || mindexHealth ? 'online' : 'offline',
      taxa_count: taxaCount,
      observation_count: consolePayload?.mindex?.observation_count ?? null,
      source: consolePayload?.mindex ? 'mas-console' : mindexHealth ? 'mindex-health' : 'empty',
    },
    masStatus: {
      status: masOnline ? 'online' : 'offline',
      reachable: masOnline,
      skip_startup: Boolean(consolePayload?.mas?.skip_startup),
      note: consolePayload?.mas?.health_note || null,
      fallback: false,
    },
    nlmStatus: {
      ...nlm,
      bound_to_ollama: false,
      forecast_qualified: false,
      forecast_p: null,
    },
    console: consolePayload,
    timestamp: now,
  });
}

export async function POST(req: Request) {
  try {
    const identity = await resolveVerifiedIdentity();
    const authError = requireOwnerOrSuperuserIdentity(identity);
    if (authError) return authError;

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
          learning_rate:
            body.learning_rate ??
            body.config?.learning_rate ??
            body.config?.learningRate ??
            body.hyperparameters?.learningRate,
          batch_size:
            body.batch_size ??
            body.config?.batch_size ??
            body.config?.batchSize ??
            body.hyperparameters?.batchSize,
          epochs: body.epochs ?? body.config?.epochs ?? body.hyperparameters?.epochs,
          categories: body.categories ?? body.config?.categories ?? [body.dataSource].filter(Boolean),
        }
      : {
          run_id: body.run_id || body.masRunId || body.runId || null,
        };

    const masRes = await fetch(`${MAS_BASE_URL}/api/nlm/training/${action}`, {
      method: 'POST',
      headers: masServiceHeaders({ 'Content-Type': 'application/json' }, identity),
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
