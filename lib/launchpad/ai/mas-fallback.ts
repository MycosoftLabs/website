/**
 * Real MYCA/MAS completion when Launchpad has no managed or BYO provider key.
 * Never invents a completion. Returns an honest miss if MAS is down.
 */

import { masHttpBaseUrl, masJsonHeaders } from '@/lib/myca/scoped-mas-user';
import type { CompleteRequest } from './providers';

export interface MasCompleteResult {
  text: string;
  provider: 'myca';
  model: string;
  inputUnits: number;
  outputUnits: number;
}

export async function completeWithMas(
  req: CompleteRequest,
  userId: string,
): Promise<MasCompleteResult | { ok: false; error: string; code: string }> {
  const base = masHttpBaseUrl();
  if (!base) {
    return { ok: false, error: 'MAS_API_URL is not set', code: 'mas_unconfigured' };
  }

  const message = [req.system?.trim(), req.user?.trim()].filter(Boolean).join('\n\n');
  if (!message) {
    return { ok: false, error: 'Empty prompt', code: 'empty_prompt' };
  }

  try {
    const res = await fetch(`${base}/api/myca/chat`, {
      method: 'POST',
      headers: masJsonHeaders(),
      body: JSON.stringify({
        message,
        user_id: userId,
        session_id: `launchpad-ai-${Date.now()}`,
        metadata: { source: 'launchpad_ai_router', prefer_fast: true },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `MYCA chat returned HTTP ${res.status}`,
        code: 'mas_complete_failed',
      };
    }
    const data = (await res.json()) as Record<string, unknown>;
    const direct = data.message ?? data.response ?? data.content ?? data.answer;
    const text = typeof direct === 'string' ? direct.trim() : '';
    if (!text) {
      return { ok: false, error: 'MYCA returned an empty completion', code: 'mas_empty' };
    }
    return {
      text,
      provider: 'myca',
      model: typeof data.model === 'string' ? data.model : 'myca',
      inputUnits: message.length,
      outputUnits: text.length,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'MYCA chat failed',
      code: 'mas_unreachable',
    };
  }
}
