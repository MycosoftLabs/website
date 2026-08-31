import { NextResponse } from 'next/server';
import { resolveMasServerBaseUrl } from '@/lib/mas-server-url';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAS_BASE_URL = resolveMasServerBaseUrl();
const NLM_BASE_URL = (
  process.env.NLM_API_URL ||
  process.env.NLM_API_BASE_URL ||
  'http://192.168.0.188:8200'
).replace(/\/$/, '');

interface TrainingLatest {
  epoch?: number;
  loss?: number;
  accuracy?: number;
  signal_samples?: number;
  overall_progress?: number;
  status?: string;
}

async function fetchJson<T>(
  url: string,
  timeoutMs = 4000,
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return { ok: false, data: null, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unreachable';
    return { ok: false, data: null, error: message };
  }
}

function mapModelStatus(latestStatus?: string, engineOnline?: boolean): string {
  const normalized = String(latestStatus || '').toLowerCase();
  if (normalized === 'live') return 'Training';
  if (normalized === 'waiting') return engineOnline ? 'Standby' : 'Offline';
  if (normalized === 'degraded') return 'Degraded';
  return engineOnline ? 'Online' : 'Unavailable';
}

export async function GET() {
  const fetchedAt = new Date().toISOString();

  const [trainingResult, healthResult] = await Promise.all([
    fetchJson<{ latest?: TrainingLatest; history?: TrainingLatest[] }>(
      `${NLM_BASE_URL}/api/training/status`,
    ),
    fetchJson<{ status?: string }>(`${NLM_BASE_URL}/health`, 2500),
  ]);

  const latest = trainingResult.data?.latest;
  const engineOnline = healthResult.ok && healthResult.data?.status === 'healthy';

  const hasMetrics =
    trainingResult.ok &&
    latest != null &&
    (latest.accuracy != null ||
      latest.signal_samples != null ||
      latest.overall_progress != null);

  const source = hasMetrics ? 'live' : engineOnline ? 'degraded' : 'unavailable';

  return NextResponse.json(
    {
      source,
      fetched_at: fetchedAt,
      phase: 'NLM-Funga Phase 0',
      model_status: mapModelStatus(latest?.status, engineOnline),
      translation_accuracy: typeof latest?.accuracy === 'number' ? latest.accuracy : null,
      signal_samples: typeof latest?.signal_samples === 'number' ? latest.signal_samples : null,
      overall_progress:
        typeof latest?.overall_progress === 'number' ? latest.overall_progress : null,
      epoch: typeof latest?.epoch === 'number' ? latest.epoch : null,
      loss: typeof latest?.loss === 'number' ? latest.loss : null,
      engine_online: engineOnline,
      provenance: {
        nlm_engine_url: NLM_BASE_URL,
        training_metrics_endpoint: `${NLM_BASE_URL}/api/training/status`,
        training_metrics_reachable: trainingResult.ok,
        mas_orchestrator_url: MAS_BASE_URL,
        note: 'Public stats come from the NLM sensory engine (MAS/NLM). The legacy MAS text-LM at /api/nlm/* is not the Nature Learning Model.',
      },
      errors: {
        training_metrics: trainingResult.ok ? undefined : trainingResult.error,
        engine_health: healthResult.ok ? undefined : healthResult.error,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'x-nlm-metrics-source': source,
      },
    },
  );
}
