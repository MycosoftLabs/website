export type AiProvider = 'anthropic' | 'openai' | 'perplexity' | 'xai' | 'cursor' | 'myca' | 'nemotron';
export type AiConnectionMode = 'managed' | 'byo' | 'mcp';
export type AiConnectionStatus = 'pending' | 'verified' | 'revoked' | 'failed';

export const AI_PROVIDERS: readonly AiProvider[] = [
  'anthropic',
  'openai',
  'perplexity',
  'xai',
  'cursor',
  'myca',
  'nemotron',
] as const;

export const INFERENCE_PROVIDERS: readonly AiProvider[] = [
  'anthropic',
  'openai',
  'perplexity',
  'xai',
  'myca',
  'nemotron',
] as const;

export function isAiProvider(v: string): v is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(v);
}

export function isInferenceProvider(v: string): v is AiProvider {
  return (INFERENCE_PROVIDERS as readonly string[]).includes(v);
}

export interface AiConnectionPublic {
  id: string;
  provider: AiProvider;
  mode: AiConnectionMode;
  status: AiConnectionStatus;
  displayPrefix: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  kmsBackend: string | null;
  /** Cursor has no public inference API in the same shape; MCP is the integration. */
  note?: string;
}

export interface CostLedgerInput {
  provider: string;
  model: string;
  providerPriceVersion: string | null;
  inputUnits: number;
  outputUnits: number;
  searchRequests: number;
  retrievalRequests: number;
  reasoningUnits: number;
  cacheRead: number;
  cacheWrite: number;
  actualCost: number | null;
  reservedCost: number | null;
  creditsCharged: number;
  byoKey: boolean;
  taskId: string | null;
  reservationId: string | null;
}
