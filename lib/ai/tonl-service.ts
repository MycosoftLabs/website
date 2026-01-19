/**
 * TONL Service - API endpoints and utilities for token optimization
 * 
 * This service provides a higher-level interface for using TONL compression
 * across the Mycosoft platform, particularly for:
 * - MYCA agent communications
 * - Research paper ingestion
 * - Real-time sensor data streaming
 * - Simulation result analysis
 */

import {
  toTONL,
  fromTONL,
  estimateTokenSavings,
  compressSpeciesData,
  compressEnvironmentalData,
  compressSimulationData,
  createOptimizedPrompt
} from './tonl-adapter';

export interface TONLConversionResult {
  original: string;
  compressed: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  estimatedTokenSavings: {
    original: number;
    compressed: number;
    saved: number;
    percent: number;
  };
}

/**
 * Convert any data structure to TONL with full metrics
 */
export function convertToTONL(data: unknown): TONLConversionResult {
  const original = JSON.stringify(data, null, 2);
  const compressed = toTONL(data, { compact: true });
  const savings = estimateTokenSavings(data);
  
  return {
    original,
    compressed,
    originalSize: original.length,
    compressedSize: compressed.length,
    compressionRatio: Math.round((1 - compressed.length / original.length) * 100) / 100,
    estimatedTokenSavings: {
      original: savings.jsonTokens,
      compressed: savings.tonlTokens,
      saved: savings.tokensSaved,
      percent: savings.savingsPercent
    }
  };
}

/**
 * Batch convert multiple data items to TONL
 */
export function batchConvertToTONL(items: unknown[]): {
  results: TONLConversionResult[];
  totalSavings: {
    originalTokens: number;
    compressedTokens: number;
    tokensSaved: number;
    averagePercent: number;
  };
} {
  const results = items.map(item => convertToTONL(item));
  
  const totalOriginal = results.reduce((sum, r) => sum + r.estimatedTokenSavings.original, 0);
  const totalCompressed = results.reduce((sum, r) => sum + r.estimatedTokenSavings.compressed, 0);
  
  return {
    results,
    totalSavings: {
      originalTokens: totalOriginal,
      compressedTokens: totalCompressed,
      tokensSaved: totalOriginal - totalCompressed,
      averagePercent: Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)
    }
  };
}

/**
 * Prepare data for MYCA agent with optimal compression
 */
export function prepareForMYCA(
  context: string,
  data: unknown,
  query: string
): {
  prompt: string;
  metadata: {
    dataType: string;
    compressionUsed: boolean;
    tokenSavings: number;
    originalTokens: number;
    optimizedTokens: number;
  };
} {
  const dataType = detectDataType(data);
  let compressedData: string;
  
  // Use specialized compression for known data types
  if (dataType === 'species' && Array.isArray(data)) {
    compressedData = compressSpeciesData(data);
  } else if (dataType === 'environmental' && Array.isArray(data)) {
    compressedData = compressEnvironmentalData(data);
  } else if (dataType === 'simulation' && typeof data === 'object') {
    compressedData = compressSimulationData(data as Parameters<typeof compressSimulationData>[0]);
  } else {
    compressedData = toTONL(data, { compact: true });
  }
  
  const result = createOptimizedPrompt(context, data, query);
  
  return {
    prompt: result.prompt,
    metadata: {
      dataType,
      compressionUsed: true,
      tokenSavings: result.originalTokens - result.optimizedTokens,
      originalTokens: result.originalTokens,
      optimizedTokens: result.optimizedTokens
    }
  };
}

/**
 * Detect data type for specialized compression
 */
function detectDataType(data: unknown): string {
  if (!data || typeof data !== 'object') return 'unknown';
  
  if (Array.isArray(data)) {
    const sample = data[0];
    if (sample && typeof sample === 'object') {
      const keys = Object.keys(sample);
      if (keys.includes('name') && (keys.includes('genus') || keys.includes('family'))) {
        return 'species';
      }
      if (keys.includes('temperature') || keys.includes('humidity') || keys.includes('co2')) {
        return 'environmental';
      }
    }
    return 'array';
  }
  
  const obj = data as Record<string, unknown>;
  if ('type' in obj && obj.type === 'simulation') {
    return 'simulation';
  }
  if ('parameters' in obj && 'results' in obj) {
    return 'simulation';
  }
  
  return 'object';
}

/**
 * Parse TONL response from AI back to structured data
 */
export function parseTONLResponse<T = unknown>(
  response: string
): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    // Look for TONL blocks in the response
    const tonlMatch = response.match(/```tonl\n([\s\S]*?)\n```/);
    if (tonlMatch) {
      const result = fromTONL<T>(tonlMatch[1]);
      if (result.errors?.length) {
        return { success: false, error: result.errors.join(', ') };
      }
      return { success: true, data: result.data };
    }
    
    // Try direct parsing
    const result = fromTONL<T>(response);
    if (result.errors?.length) {
      return { success: false, error: result.errors.join(', ') };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse TONL response'
    };
  }
}

// Re-export core functions
export {
  toTONL,
  fromTONL,
  estimateTokenSavings,
  compressSpeciesData,
  compressEnvironmentalData,
  compressSimulationData,
  createOptimizedPrompt
};
