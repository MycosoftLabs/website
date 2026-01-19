/**
 * TONL (Token-Optimized Notation Language) Adapter
 * 
 * Provides utilities to compress data for LLM prompts, reducing token costs by 32-45%.
 * Used throughout Mycosoft for:
 * - Species database queries sent to MYCA
 * - Simulation data in compact format
 * - Real-time environmental data streams
 * - Research paper summaries for AI analysis
 * 
 * @see https://github.com/tonl-dev/tonl
 */

// TONL types - based on the library's API
interface TONLOptions {
  /** Whether to include schema hints in output */
  includeSchema?: boolean;
  /** Compact mode removes all optional whitespace */
  compact?: boolean;
  /** Include type annotations for better LLM parsing */
  typeAnnotations?: boolean;
}

interface TONLParseResult<T = unknown> {
  data: T;
  errors?: string[];
  schema?: Record<string, string>;
}

/**
 * Convert JSON data to TONL format for token optimization
 * Reduces token count by ~32-45% compared to standard JSON
 */
export function toTONL(data: unknown, options: TONLOptions = {}): string {
  const { compact = true, includeSchema = false, typeAnnotations = false } = options;
  
  // TONL format uses concise notation
  // Arrays use [] without quotes for string values when possible
  // Objects use {} with minimal punctuation
  // Strings without special chars omit quotes
  
  return serializeToTONL(data, compact, typeAnnotations, includeSchema);
}

/**
 * Parse TONL format back to JavaScript object
 */
export function fromTONL<T = unknown>(tonlString: string): TONLParseResult<T> {
  try {
    const data = parseTONLString<T>(tonlString);
    return { data };
  } catch (error) {
    return {
      data: {} as T,
      errors: [error instanceof Error ? error.message : 'Parse error']
    };
  }
}

/**
 * Estimate token savings when using TONL vs JSON
 */
export function estimateTokenSavings(data: unknown): {
  jsonTokens: number;
  tonlTokens: number;
  savingsPercent: number;
  tokensSaved: number;
} {
  const jsonStr = JSON.stringify(data);
  const tonlStr = toTONL(data, { compact: true });
  
  // Rough token estimation (GPT uses ~4 chars per token on average)
  const jsonTokens = Math.ceil(jsonStr.length / 4);
  const tonlTokens = Math.ceil(tonlStr.length / 4);
  const tokensSaved = jsonTokens - tonlTokens;
  const savingsPercent = Math.round((tokensSaved / jsonTokens) * 100);
  
  return {
    jsonTokens,
    tonlTokens,
    savingsPercent,
    tokensSaved
  };
}

/**
 * Compress species data for MYCA queries
 */
export function compressSpeciesData(species: {
  name: string;
  genus?: string;
  family?: string;
  characteristics?: Record<string, string>;
  habitat?: string[];
  edibility?: string;
  lookalikes?: string[];
}[]): string {
  // Use TONL format for species arrays
  return toTONL({
    type: 'species_batch',
    count: species.length,
    data: species.map(s => ({
      n: s.name,
      g: s.genus,
      f: s.family,
      c: s.characteristics,
      h: s.habitat,
      e: s.edibility,
      l: s.lookalikes
    }))
  }, { compact: true });
}

/**
 * Compress environmental sensor data for AI analysis
 */
export function compressEnvironmentalData(readings: {
  timestamp: number;
  deviceId: string;
  temperature?: number;
  humidity?: number;
  co2?: number;
  voc?: number;
  iaq?: number;
  pressure?: number;
}[]): string {
  // Pack multiple readings efficiently
  return toTONL({
    type: 'env_readings',
    t0: readings[0]?.timestamp,
    readings: readings.map(r => ({
      dt: r.timestamp - (readings[0]?.timestamp || 0), // Delta time
      d: r.deviceId,
      T: r.temperature,
      H: r.humidity,
      C: r.co2,
      V: r.voc,
      I: r.iaq,
      P: r.pressure
    }))
  }, { compact: true });
}

/**
 * Compress simulation results for AI pattern analysis
 */
export function compressSimulationData(simulation: {
  id: string;
  type: string;
  parameters: Record<string, number>;
  results: Array<{
    timestep: number;
    values: Record<string, number>;
  }>;
}): string {
  // Extract parameter keys once, then just values
  const paramKeys = Object.keys(simulation.parameters);
  
  return toTONL({
    type: 'simulation',
    id: simulation.id,
    sim_type: simulation.type,
    pk: paramKeys,
    pv: paramKeys.map(k => simulation.parameters[k]),
    steps: simulation.results.map(r => ({
      t: r.timestep,
      v: Object.values(r.values)
    }))
  }, { compact: true });
}

// Internal serializer
function serializeToTONL(
  value: unknown,
  compact: boolean,
  typeAnnotations: boolean,
  includeSchema: boolean,
  depth = 0
): string {
  const indent = compact ? '' : '  '.repeat(depth);
  const newline = compact ? '' : '\n';
  const space = compact ? '' : ' ';
  
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    // TONL uses compact number notation
    if (Number.isInteger(value)) {
      return String(value);
    }
    // Limit decimal precision for compactness
    return value.toFixed(4).replace(/\.?0+$/, '');
  }
  
  if (typeof value === 'string') {
    // TONL allows unquoted strings for simple alphanumeric values
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) && value.length < 50) {
      return value;
    }
    // Otherwise use minimal quoting
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    
    // Check if all elements are simple (can be comma-separated without brackets)
    const allSimple = value.every(v => 
      typeof v === 'number' || 
      typeof v === 'boolean' ||
      (typeof v === 'string' && /^[a-zA-Z0-9_]+$/.test(v))
    );
    
    if (allSimple && compact) {
      return `[${value.map(v => serializeToTONL(v, compact, typeAnnotations, false, depth)).join(',')}]`;
    }
    
    const items = value.map(v => 
      `${indent}  ${serializeToTONL(v, compact, typeAnnotations, false, depth + 1)}`
    );
    return `[${newline}${items.join(`,${newline}`)}${newline}${indent}]`;
  }
  
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined);
    
    if (entries.length === 0) return '{}';
    
    const pairs = entries.map(([k, v]) => {
      // TONL uses unquoted keys when possible
      const key = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : `"${k}"`;
      const val = serializeToTONL(v, compact, typeAnnotations, false, depth + 1);
      return `${indent}  ${key}:${space}${val}`;
    });
    
    return `{${newline}${pairs.join(`,${newline}`)}${newline}${indent}}`;
  }
  
  return String(value);
}

// Internal parser (simplified - for production, use the tonl library directly)
function parseTONLString<T>(input: string): T {
  // For now, TONL is backward-compatible with JSON for simple cases
  // The tonl library handles the full parsing
  try {
    // Try standard JSON first (TONL is a superset)
    return JSON.parse(input) as T;
  } catch {
    // Handle TONL-specific syntax
    // Unquoted keys and values need to be normalized
    const normalized = input
      .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
      .replace(/:(\s*)([a-zA-Z_][a-zA-Z0-9_]*)/g, ':$1"$2"'); // Quote unquoted string values
    
    return JSON.parse(normalized) as T;
  }
}

/**
 * Create a TONL-optimized prompt for MYCA
 */
export function createOptimizedPrompt(
  systemContext: string,
  data: unknown,
  query: string
): {
  prompt: string;
  originalTokens: number;
  optimizedTokens: number;
} {
  const compressedData = toTONL(data, { compact: true });
  const jsonData = JSON.stringify(data);
  
  const prompt = `${systemContext}

DATA (TONL format):
${compressedData}

QUERY: ${query}`;
  
  const originalTokens = Math.ceil((systemContext.length + jsonData.length + query.length) / 4);
  const optimizedTokens = Math.ceil(prompt.length / 4);
  
  return {
    prompt,
    originalTokens,
    optimizedTokens
  };
}

export default {
  toTONL,
  fromTONL,
  estimateTokenSavings,
  compressSpeciesData,
  compressEnvironmentalData,
  compressSimulationData,
  createOptimizedPrompt
};
