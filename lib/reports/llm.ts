// ═══════════════════════════════════════════════════════════════════════════
// Report LLM client — provider-agnostic narrative generator
// ═══════════════════════════════════════════════════════════════════════════
//
// The engine behind MYCA's "reports agent": given a system + user prompt (with
// real data as context), it produces polished, government-standard document
// prose. Provider-agnostic so it works company-wide, not just for security.
//
// Provider preference (first configured wins; override with REPORTS_LLM_PROVIDER):
//   1. Perplexity  (PERPLEXITY_API_KEY)      — Morgan's preferred doc engine; sonar-pro
//   2. NVIDIA NIM  (NVIDIA_NIM_API_KEY)      — Nemotron, self-hostable / NIM cloud
//   3. Anthropic   (ANTHROPIC_API_KEY)       — Claude
//   4. OpenAI      (OPENAI_API_KEY)          — GPT
//   5. Groq        (GROQ_API_KEY)            — fast Llama
//
// If none is configured, generateNarrative() returns null and callers fall back
// to a deterministic, data-only document (still real — just no LLM prose).

export type ReportProvider = 'perplexity' | 'nvidia-nim' | 'anthropic' | 'openai' | 'groq';

export interface NarrativeRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** Use the multi-step reasoning model (Perplexity sonar-reasoning-pro) for
   *  statutory / supply-chain / cross-clause synthesis. Default false. */
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
    { provider: 'perplexity', keyEnv: 'PERPLEXITY_API_KEY', model: process.env.PERPLEXITY_MODEL || 'sonar-pro', endpoint: 'https://api.perplexity.ai/chat/completions', style: 'openai' },
    { provider: 'nvidia-nim', keyEnv: 'NVIDIA_NIM_API_KEY', model: process.env.NVIDIA_NIM_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct', endpoint: (process.env.NVIDIA_NIM_API_URL || 'https://integrate.api.nvidia.com/v1') + '/chat/completions', style: 'openai' },
    { provider: 'anthropic', keyEnv: 'ANTHROPIC_API_KEY', model: process.env.ANTHROPIC_REPORT_MODEL || 'claude-sonnet-4-5', endpoint: 'https://api.anthropic.com/v1/messages', style: 'anthropic' },
    { provider: 'openai', keyEnv: 'OPENAI_API_KEY', model: process.env.OPENAI_REPORT_MODEL || 'gpt-4o', endpoint: 'https://api.openai.com/v1/chat/completions', style: 'openai' },
    { provider: 'groq', keyEnv: 'GROQ_API_KEY', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', endpoint: 'https://api.groq.com/openai/v1/chat/completions', style: 'openai' },
  ];
}

function selectProvider(): ProviderConfig | null {
  const chain = providerChain();
  const forced = (process.env.REPORTS_LLM_PROVIDER || '').toLowerCase();
  if (forced) {
    const c = chain.find((p) => p.provider === forced);
    if (c && (process.env[c.keyEnv] || '').trim()) return c;
  }
  return chain.find((p) => (process.env[p.keyEnv] || '').trim()) ?? null;
}

/** The configured provider, or null. Lets callers report what will be used. */
export function activeReportProvider(): { provider: ReportProvider; model: string } | null {
  const c = selectProvider();
  return c ? { provider: c.provider, model: c.model } : null;
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
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
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
  return (data?.content ?? []).map((b: { text?: string }) => b.text ?? '').join('');
}

function configuredProviders(): ProviderConfig[] {
  const chain = providerChain();
  const forced = (process.env.REPORTS_LLM_PROVIDER || '').toLowerCase();
  if (forced) {
    const c = chain.find((p) => p.provider === forced);
    if (c && (process.env[c.keyEnv] || '').trim()) return [c];
  }
  return chain.filter((p) => (process.env[p.keyEnv] || '').trim());
}

/**
 * Generate document prose from a prompt. Returns null (never throws) when no
 * provider is configured or all providers fail, so report building degrades to a
 * deterministic data-only document instead of breaking.
 *
 * Tries every configured provider in preference order (Perplexity → NIM →
 * Anthropic → OpenAI → Groq) so a missing/broken PERPLEXITY_API_KEY does not
 * kill narrative when Anthropic/OpenAI are present.
 */
export async function generateNarrative(req: NarrativeRequest): Promise<NarrativeResult | null> {
  const providers = configuredProviders();
  if (providers.length === 0) return null;

  for (const base of providers) {
    // Per Perplexity: sonar-pro is the default; use sonar-reasoning-pro for
    // statutory / supply-chain / cross-clause synthesis (reasoning=true).
    const model =
      req.reasoning && base.provider === 'perplexity'
        ? process.env.PERPLEXITY_MODEL_REASONING || 'sonar-reasoning-pro'
        : base.model;
    const c: ProviderConfig = { ...base, model };
    const key = (process.env[c.keyEnv] || '').trim();
    try {
      const text = c.style === 'anthropic' ? await callAnthropic(c, req, key) : await callOpenAiStyle(c, req, key);
      if (!text.trim()) {
        console.warn(`[reports/llm] empty response from ${c.provider}; trying next provider`);
        continue;
      }
      return { text: text.trim(), provider: c.provider, model: c.model };
    } catch (e) {
      console.warn(`[reports/llm] ${c.provider} failed; trying next provider:`, e);
    }
  }
  return null;
}
