/**
 * TONL API Endpoint
 * 
 * Provides token optimization services for the Mycosoft platform.
 * Converts data to/from TONL format for efficient AI communication.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  convertToTONL,
  batchConvertToTONL,
  prepareForMYCA,
  parseTONLResponse
} from '@/lib/ai/tonl-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, context, query } = body;

    switch (action) {
      case 'convert': {
        // Convert single data item to TONL
        if (!data) {
          return NextResponse.json(
            { error: 'Data is required for conversion' },
            { status: 400 }
          );
        }
        const result = convertToTONL(data);
        return NextResponse.json({
          success: true,
          ...result
        });
      }

      case 'batch': {
        // Convert multiple items to TONL
        if (!Array.isArray(data)) {
          return NextResponse.json(
            { error: 'Data must be an array for batch conversion' },
            { status: 400 }
          );
        }
        const result = batchConvertToTONL(data);
        return NextResponse.json({
          success: true,
          ...result
        });
      }

      case 'prepare-prompt': {
        // Prepare optimized prompt for MYCA
        if (!context || !data || !query) {
          return NextResponse.json(
            { error: 'Context, data, and query are required' },
            { status: 400 }
          );
        }
        const result = prepareForMYCA(context, data, query);
        return NextResponse.json({
          success: true,
          ...result
        });
      }

      case 'parse': {
        // Parse TONL response from AI
        if (!data || typeof data !== 'string') {
          return NextResponse.json(
            { error: 'String data is required for parsing' },
            { status: 400 }
          );
        }
        const result = parseTONLResponse(data);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: convert, batch, prepare-prompt, parse` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('TONL API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'TONL processing failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return API documentation
  return NextResponse.json({
    name: 'TONL API',
    version: '1.0.0',
    description: 'Token-Optimized Notation Language service for AI communication',
    endpoints: {
      'POST /api/ai/tonl': {
        actions: {
          convert: {
            description: 'Convert data to TONL format',
            params: { data: 'any' },
            returns: 'TONLConversionResult'
          },
          batch: {
            description: 'Batch convert multiple items',
            params: { data: 'array' },
            returns: 'BatchConversionResult'
          },
          'prepare-prompt': {
            description: 'Prepare optimized prompt for MYCA',
            params: { context: 'string', data: 'any', query: 'string' },
            returns: 'OptimizedPrompt'
          },
          parse: {
            description: 'Parse TONL response from AI',
            params: { data: 'string' },
            returns: 'ParsedData'
          }
        }
      }
    },
    benefits: {
      tokenReduction: '32-45% average reduction in token count',
      costSavings: 'Proportional reduction in LLM API costs',
      supportedDataTypes: [
        'species (specialized compression)',
        'environmental readings',
        'simulation results',
        'generic JSON objects'
      ]
    }
  });
}
