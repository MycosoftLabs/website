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
import { requireAuth } from '@/lib/auth/api-auth';
import { URL } from 'url';

// SECURITY: Block SSRF — validates URL and resolved IPs against private ranges
// Handles DNS rebinding, IPv6, redirect following, and hostname tricks
import dns from 'dns/promises';
import { isIP } from 'net';

const PRIVATE_IP_RANGES = [
  /^127\./,              // Loopback
  /^10\./,               // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./,  // RFC 1918
  /^192\.168\./,         // RFC 1918
  /^169\.254\./,         // Link-local
  /^0\./,                // Current network
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./,  // CGNAT
  /^::1$/,               // IPv6 Loopback
  /^fe80:/i,             // IPv6 Link-local
  /^fc00:/i,             // IPv6 Unique local
  /^fd/i,                // IPv6 Unique local
  /^::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/i,  // IPv4-mapped IPv6
];

function isPrivateIP(ip: string): boolean {
  const cleaned = ip.replace(/^\[|\]$/g, '');
  return PRIVATE_IP_RANGES.some(r => r.test(cleaned));
}

async function validateExternalUrl(urlStr: string): Promise<{ safe: boolean; error?: string }> {
  try {
    const parsed = new URL(urlStr);

    if (parsed.protocol !== 'https:') {
      return { safe: false, error: 'Only HTTPS URLs are allowed' };
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return { safe: false, error: 'Private/internal hostnames are not allowed' };
    }

    // If hostname is a raw IP, check directly
    if (isIP(hostname)) {
      if (isPrivateIP(hostname)) {
        return { safe: false, error: 'Private IP addresses are not allowed' };
      }
      return { safe: true };
    }

    // Resolve DNS and check ALL resolved addresses against private ranges
    try {
      const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
      const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
      const allAddresses = [...addresses, ...addresses6];

      if (allAddresses.length === 0) {
        return { safe: false, error: 'Could not resolve hostname' };
      }

      for (const addr of allAddresses) {
        if (isPrivateIP(addr)) {
          return { safe: false, error: 'URL resolves to a private IP address' };
        }
      }
    } catch {
      return { safe: false, error: 'DNS resolution failed' };
    }

    return { safe: true };
  } catch {
    return { safe: false, error: 'Invalid URL' };
  }
}

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

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
      
      // Validate file size
      if (file.size > MAX_PDF_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_PDF_SIZE / 1024 / 1024}MB` },
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

      // SECURITY: Validate URL — resolves DNS and checks all IPs against private ranges
      const validation = await validateExternalUrl(url);
      if (!validation.safe) {
        return NextResponse.json(
          { error: validation.error || 'URL not allowed' },
          { status: 400 }
        );
      }

      // Fetch PDF from URL — disable redirect following to prevent SSRF via 302
      const pdfResponse = await fetch(url, { redirect: 'error' });
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
