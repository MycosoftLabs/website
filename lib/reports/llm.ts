// ═══════════════════════════════════════════════════════════════════════════
// Report LLM client — provider-agnostic narrative generator
// ═══════════════════════════════════════════════════════════════════════════
//
// The engine behind MYCA's reports agent. All listed providers are commercial
// endpoints outside Mycosoft's CUI boundary. The central guard must pass before
// a request leaves the process and before a response is accepted.

import { assertNonCui, CuiBoundaryError } from '@/lib/security/cui/cui-guard';

export type ReportProvider = 'perplexity' | 'nvidia-nim' | 'anthropic' | 'openai' | 'groq';

export interface NarrativeRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Use the multi-step reasoning model for statutory/cross-clause synthesis. */
  reasoning?: boolean;
}

export interface NarrativeResult {
  text: string;
  provider: ReportProvider;
  model: string;
}

interface ProviderConfig {
  provider: ReportProvider;
  keyEnv: string;
  model: string;
  endpoint: string;
  style: 'openai' | 'anthropic';
}

function providerChain(): ProviderConfig[] {
  return [
    {
      provider: 'perplexity',
      keyEnv: 'PERPLEXITY_API_KEY',
      model: process.env.PERPLEXITY_MODEL || 'sonar-pro',
      endpoint: 'https://api.perplexity.ai/chat/completions',
      style: 'openai',
    },
    {
      provider: 'nvidia-nim',
      keyEnv: 'NVIDIA_NIM_API_KEY',
      model: process.env.NVIDIA_NIM_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct',
      endpoint: (process.env.NVIDIA_NIM_API_URL || 'https://integrate.api.nvidia.com/v1') + '/chat/completions',
      style: 'openai',
    },
    {
      provider: 'anthropic',
      keyEnv: 'ANTHROPIC_API_KEY',
      model: process.env.ANTHROPIC_REPORT_MODEL || 'claude-sonnet-4-5',
      endpoint: 'https://api.anthropic.com/v1/messages',
      style: 'anthropic',
    },
    {
      provider: 'openai',
      keyEnv: 'OPENAI_API_KEY',
      model: process.env.OPENAI_REPORT_MODEL || 'gpt-4o',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      style: 'openai',
    },
    {
      provider: 'groq',
      keyEnv: 'GROQ_API_KEY',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      style: 'openai',
    },
  ];
}

function selectProvider(): ProviderConfig | null {
  const chain = providerChain();
  const forced = (process.env.REPORTS_LLM_PROVIDER || '').toLowerCase();
  if (forced) {
    const provider = chain.find((candidate) => candidate.provider === forced);
    if (provider && (process.env[provider.keyEnv] || '').trim()) return provider;
  }
  return chain.find((provider) => (process.env[provider.keyEnv] || '').trim()) ?? null;
}

export function activeReportProvider(): { provider: ReportProvider; model: string } | null {
  const provider = selectProvider();
  return provider ? { provider: provider.provider, model: provider.model } : null;
}

async function callOpenAiStyle(c: ProviderConfig, req: NarrativeRequest, key: string): Promise<string> {
  const res = await fetch(c.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: c.model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      max_tokens: req.maxTokens ?? 2000,
      temperature: req.temperature ?? 0.2,
    }),
  });
  if (!res.ok) throw new Error(`${c.provider} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(c: ProviderConfig, req: NarrativeRequest, key: string): Promise<string> {
  const res = await fetch(c.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: c.model,
      max_tokens: req.maxTokens ?? 2000,
      temperature: req.temperature ?? 0.2,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data?.content ?? []).map((block: { text?: string }) => block.text ?? '').join('');
}

function configuredProviders(): ProviderConfig[] {
  const chain = providerChain();
  const forced = (process.env.REPORTS_LLM_PROVIDER || '').toLowerCase();
  if (forced) {
    const provider = chain.find((candidate) => candidate.provider === forced);
    if (provider && (process.env[provider.keyEnv] || '').trim()) return [provider];
  }
  return chain.filter((provider) => (process.env[provider.keyEnv] || '').trim());
}

/**
 * Generate non-CUI document prose. A CUI/secret policy block always fails closed;
 * ordinary provider/network failures may fall through to the next configured provider.
 */
export async function generateNarrative(req: NarrativeRequest): Promise<NarrativeResult | null> {
  assertNonCui({ system: req.system, user: req.user }, 'reports.llm.request');

  const providers = configuredProviders();
  if (providers.length === 0) return null;

  for (const base of providers) {
    const model =
      req.reasoning && base.provider === 'perplexity'
        ? process.env.PERPLEXITY_MODEL_REASONING || 'sonar-reasoning-pro'
        : base.model;
    const c: ProviderConfig = { ...base, model };
    const key = (process.env[c.keyEnv] || '').trim();

    try {
      const text =
        c.style === 'anthropic'
          ? await callAnthropic(c, req, key)
          : await callOpenAiStyle(c, req, key);
      if (!text.trim()) {
        console.warn(`[reports/llm] empty response from ${c.provider}; trying next provider`);
        continue;
      }
      const normalized = text.trim();
      assertNonCui(normalized, `reports.llm.response.${c.provider}`);
      return { text: normalized, provider: c.provider, model: c.model };
    } catch (error) {
      if (error instanceof CuiBoundaryError) throw error;
      console.warn(`[reports/llm] ${c.provider} failed; trying next provider:`, error);
    }
  }
  return null;
}
