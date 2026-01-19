/**
 * PDF Extraction API Endpoint
 * 
 * Extracts text from research papers and converts to Markdown for MINDEX ingestion.
 * Supports both direct PDF upload and URL-based extraction.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractTextFromPDF,
  convertToMarkdown,
  processResearchPaper
} from '@/lib/research/pdf-extractor';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Handle multipart form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const action = formData.get('action') as string || 'extract';
      
      if (!file) {
        return NextResponse.json(
          { error: 'No PDF file provided' },
          { status: 400 }
        );
      }
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'File must be a PDF' },
          { status: 400 }
        );
      }
      
      // Convert to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Check zpdf service availability
      const zpdfEndpoint = process.env.ZPDF_SERVICE_URL;
      const useZpdf = !!zpdfEndpoint;
      
      switch (action) {
        case 'extract': {
          const result = await extractTextFromPDF(buffer, { useZpdf, zpdfEndpoint });
          return NextResponse.json(result);
        }
        
        case 'markdown': {
          const extraction = await extractTextFromPDF(buffer, { useZpdf, zpdfEndpoint });
          const markdown = convertToMarkdown(extraction);
          return NextResponse.json({
            extraction,
            markdown
          });
        }
        
        case 'process': {
          const result = await processResearchPaper(buffer, { useZpdf, zpdfEndpoint });
          return NextResponse.json(result);
        }
        
        default:
          return NextResponse.json(
            { error: `Unknown action: ${action}` },
            { status: 400 }
          );
      }
    }
    
    // Handle JSON body (URL-based extraction)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { url, action = 'extract' } = body;
      
      if (!url) {
        return NextResponse.json(
          { error: 'URL is required for JSON requests' },
          { status: 400 }
        );
      }
      
      // Fetch PDF from URL
      const pdfResponse = await fetch(url);
      if (!pdfResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF: ${pdfResponse.status}` },
          { status: 400 }
        );
      }
      
      const buffer = Buffer.from(await pdfResponse.arrayBuffer());
      
      const zpdfEndpoint = process.env.ZPDF_SERVICE_URL;
      const useZpdf = !!zpdfEndpoint;
      
      switch (action) {
        case 'extract': {
          const result = await extractTextFromPDF(buffer, { useZpdf, zpdfEndpoint });
          return NextResponse.json(result);
        }
        
        case 'markdown': {
          const extraction = await extractTextFromPDF(buffer, { useZpdf, zpdfEndpoint });
          const markdown = convertToMarkdown(extraction);
          return NextResponse.json({
            extraction,
            markdown
          });
        }
        
        case 'process': {
          const result = await processResearchPaper(buffer, { useZpdf, zpdfEndpoint });
          return NextResponse.json(result);
        }
        
        default:
          return NextResponse.json(
            { error: `Unknown action: ${action}` },
            { status: 400 }
          );
      }
    }
    
    return NextResponse.json(
      { error: 'Request must be multipart/form-data or application/json' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'PDF extraction failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return API documentation
  return NextResponse.json({
    name: 'PDF Extraction API',
    version: '1.0.0',
    description: 'Extract text from research papers and convert to Markdown for MINDEX',
    endpoints: {
      'POST /api/research/extract-pdf': {
        'multipart/form-data': {
          params: {
            file: 'PDF file (required)',
            action: 'extract | markdown | process (default: extract)'
          }
        },
        'application/json': {
          params: {
            url: 'URL to PDF file (required)',
            action: 'extract | markdown | process (default: extract)'
          }
        },
        actions: {
          extract: 'Extract raw text and metadata',
          markdown: 'Convert to structured Markdown with sections',
          process: 'Full processing for MINDEX ingestion'
        }
      }
    },
    features: [
      'Text extraction from PDF research papers',
      'Automatic section detection (Abstract, Introduction, Methods, etc.)',
      'Citation/reference extraction',
      'Metadata extraction (title, authors, dates, keywords)',
      'Markdown conversion for knowledge base storage',
      'Support for high-performance zpdf service when available'
    ],
    zpdfStatus: process.env.ZPDF_SERVICE_URL ? 'enabled' : 'disabled (using pdf-parse)'
  });
}
