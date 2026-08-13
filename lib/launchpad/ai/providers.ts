/**
 * Provider adapters. Keys are passed in-memory only and must never be logged.
 * Prompt firewall is applied by the router before these functions run.
 */

import type { AiProvider } from './types';
import { redactSecrets } from '@/lib/launchpad/crypto/envelope';

export interface CompleteRequest {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
}

export interface CompleteResult {
  text: string;
  provider: AiProvider;
  model: string;
  inputUnits: number;
  outputUnits: number;
}

export interface VerifyResult {
  ok: boolean;
  message: string;
}

function headersOpenAi(key: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
}

async function postJson(
  url: string,
  headers: HeadersInit,
  body: unknown,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; text: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

export async function verifyProviderKey(provider: AiProvider, key: string): Promise<VerifyResult> {
  try {
    if (provider === 'cursor') {
      return {
        ok: true,
        message: 'Cursor has no public inference API in this shape. Connect via MCP using a Launchpad API key (scope read). No provider secret is stored.',
      };
    }
    if (provider === 'anthropic') {
      const r = await postJson(
        'https://api.anthropic.com/v1/messages',
        {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        {
          model: 'claude-sonnet-4-5',
          max_tokens: 8,
          messages: [{ role: 'user', content: 'ping' }],
        },
      );
      return r.ok || r.status === 400
        ? { ok: true, message: 'Anthropic key accepted.' }
        : { ok: false, message: `Anthropic rejected the key (HTTP ${r.status}).` };
    }
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      return res.ok
        ? { ok: true, message: 'OpenAI key accepted.' }
        : { ok: false, message: `OpenAI rejected the key (HTTP ${res.status}).` };
    }
    if (provider === 'perplexity') {
      const r = await postJson(
        'https://api.perplexity.ai/chat/completions',
        headersOpenAi(key),
        {
          model: 'sonar',
          max_tokens: 8,
          messages: [{ role: 'user', content: 'ping' }],
        },
      );
      return r.ok
        ? { ok: true, message: 'Perplexity key accepted.' }
        : { ok: false, message: `Perplexity rejected the key (HTTP ${r.status}).` };
    }
    if (provider === 'xai') {
      const r = await postJson(
        'https://api.x.ai/v1/chat/completions',
        headersOpenAi(key),
        {
          model: 'grok-2-latest',
          max_tokens: 8,
          messages: [{ role: 'user', content: 'ping' }],
        },
      );
      return r.ok
        ? { ok: true, message: 'xAI key accepted.' }
        : { ok: false, message: `xAI rejected the key (HTTP ${r.status}).` };
    }
    return { ok: false, message: 'Unknown provider' };
  } catch (err) {
    return { ok: false, message: redactSecrets(err instanceof Error ? err.message : 'verify failed') };
  }
}

export async function completeWithKey(
  provider: AiProvider,
  key: string,
  req: CompleteRequest,
): Promise<CompleteResult> {
  if (provider === 'cursor') {
    throw new Error('Cursor is MCP-only in this build — no inference complete().');
  }
  if (provider === 'anthropic') {
    const model = req.model || 'claude-sonnet-4-5';
    const r = await postJson(
      'https://api.anthropic.com/v1/messages',
      {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      {
        model,
        max_tokens: req.maxTokens ?? 1024,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
      },
    );
    if (!r.ok || !r.json) throw new Error(`Anthropic complete failed (HTTP ${r.status})`);
    const content = r.json.content as Array<{ type: string; text?: string }> | undefined;
    const text = content?.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n') ?? '';
    const usage = (r.json.usage as { input_tokens?: number; output_tokens?: number } | undefined) ?? {};
    return {
      text,
      provider,
      model,
      inputUnits: usage.input_tokens ?? 0,
      outputUnits: usage.output_tokens ?? 0,
    };
  }

  const model =
    req.model ||
    (provider === 'openai' ? 'gpt-4o' : provider === 'perplexity' ? 'sonar-pro' : 'grok-2-latest');
  const url =
    provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : provider === 'perplexity'
        ? 'https://api.perplexity.ai/chat/completions'
        : 'https://api.x.ai/v1/chat/completions';
  const r = await postJson(url, headersOpenAi(key), {
    model,
    max_tokens: req.maxTokens ?? 1024,
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.user },
    ],
  });
  if (!r.ok || !r.json) throw new Error(`${provider} complete failed (HTTP ${r.status})`);
  const choices = r.json.choices as Array<{ message?: { content?: string } }> | undefined;
  const text = choices?.[0]?.message?.content ?? '';
  const usage = (r.json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined) ?? {};
  return {
    text,
    provider,
    model,
    inputUnits: usage.prompt_tokens ?? 0,
    outputUnits: usage.completion_tokens ?? 0,
  };
}

/** Managed-key complete using platform env. Returns null if that provider is not configured. */
export function managedKeyFor(provider: AiProvider): string | null {
  const envName =
    provider === 'anthropic'
      ? 'ANTHROPIC_API_KEY'
      : provider === 'openai'
        ? 'OPENAI_API_KEY'
        : provider === 'perplexity'
          ? 'PERPLEXITY_API_KEY'
          : provider === 'xai'
            ? 'XAI_API_KEY'
            : null;
  if (!envName) return null;
  const v = (process.env[envName] ?? '').trim();
  return v || null;
}
