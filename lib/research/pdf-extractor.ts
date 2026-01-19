/**
 * PDF Text Extraction Service
 * 
 * Extracts text from research papers and converts to structured formats
 * for ingestion into Mycosoft's knowledge base (MINDEX).
 * 
 * Uses pdf-parse for Node.js extraction, with optional zpdf service
 * for high-performance Zig-based extraction when available.
 * 
 * @see https://github.com/Lulzx/zpdf
 */

// pdf-parse doesn't have types, so we use any
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface PDFExtractionResult {
  success: boolean;
  text?: string;
  metadata?: PDFMetadata;
  pages?: number;
  error?: string;
  processingTime?: number;
  method: 'pdf-parse' | 'zpdf';
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  keywords?: string[];
}

export interface MarkdownConversionResult {
  success: boolean;
  markdown?: string;
  sections?: PDFSection[];
  citations?: string[];
  abstract?: string;
  error?: string;
}

export interface PDFSection {
  title: string;
  content: string;
  level: number;
  pageStart?: number;
}

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer,
  options: {
    useZpdf?: boolean;
    zpdfEndpoint?: string;
  } = {}
): Promise<PDFExtractionResult> {
  const startTime = Date.now();
  
  // Try zpdf service if configured
  if (options.useZpdf && options.zpdfEndpoint) {
    try {
      const result = await extractWithZpdf(pdfBuffer, options.zpdfEndpoint);
      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      console.warn('zpdf extraction failed, falling back to pdf-parse:', error);
    }
  }
  
  // Use pdf-parse as default/fallback
  try {
    const data = await pdfParse(pdfBuffer);
    
    return {
      success: true,
      text: data.text,
      pages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        keywords: data.info?.Keywords?.split(',').map((k: string) => k.trim())
      },
      processingTime: Date.now() - startTime,
      method: 'pdf-parse'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF extraction failed',
      processingTime: Date.now() - startTime,
      method: 'pdf-parse'
    };
  }
}

/**
 * Extract text using zpdf service (Zig-based, high-performance)
 */
async function extractWithZpdf(
  pdfBuffer: Buffer,
  endpoint: string
): Promise<PDFExtractionResult> {
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer]), 'document.pdf');
  
  const response = await fetch(`${endpoint}/extract`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`zpdf service error: ${response.status}`);
  }
  
  const result = await response.json();
  
  return {
    success: true,
    text: result.text,
    pages: result.pages,
    metadata: result.metadata,
    method: 'zpdf'
  };
}

/**
 * Convert extracted PDF text to Markdown format
 */
export function convertToMarkdown(
  extractionResult: PDFExtractionResult
): MarkdownConversionResult {
  if (!extractionResult.success || !extractionResult.text) {
    return {
      success: false,
      error: extractionResult.error || 'No text to convert'
    };
  }
  
  const text = extractionResult.text;
  const sections = parseSections(text);
  const abstract = extractAbstract(text);
  const citations = extractCitations(text);
  
  // Build markdown
  let markdown = '';
  
  // Add metadata as frontmatter
  if (extractionResult.metadata) {
    markdown += '---\n';
    if (extractionResult.metadata.title) {
      markdown += `title: "${extractionResult.metadata.title}"\n`;
    }
    if (extractionResult.metadata.author) {
      markdown += `author: "${extractionResult.metadata.author}"\n`;
    }
    if (extractionResult.metadata.creationDate) {
      markdown += `date: "${extractionResult.metadata.creationDate.toISOString().split('T')[0]}"\n`;
    }
    if (extractionResult.metadata.keywords?.length) {
      markdown += `keywords: [${extractionResult.metadata.keywords.map(k => `"${k}"`).join(', ')}]\n`;
    }
    markdown += '---\n\n';
  }
  
  // Add title
  if (extractionResult.metadata?.title) {
    markdown += `# ${extractionResult.metadata.title}\n\n`;
  }
  
  // Add abstract
  if (abstract) {
    markdown += `## Abstract\n\n${abstract}\n\n`;
  }
  
  // Add sections
  for (const section of sections) {
    const heading = '#'.repeat(section.level + 1);
    markdown += `${heading} ${section.title}\n\n${section.content}\n\n`;
  }
  
  // Add citations if found
  if (citations.length > 0) {
    markdown += `## References\n\n`;
    citations.forEach((citation, index) => {
      markdown += `${index + 1}. ${citation}\n`;
    });
  }
  
  return {
    success: true,
    markdown,
    sections,
    citations,
    abstract
  };
}

/**
 * Parse sections from PDF text
 */
function parseSections(text: string): PDFSection[] {
  const sections: PDFSection[] = [];
  const lines = text.split('\n');
  
  let currentSection: PDFSection | null = null;
  let currentContent: string[] = [];
  
  // Common section header patterns
  const sectionPatterns = [
    /^(\d+\.?\s+)?([A-Z][A-Z\s]+)$/,  // "1. INTRODUCTION" or "INTRODUCTION"
    /^(Introduction|Methods|Results|Discussion|Conclusion|Abstract|References|Background|Materials|Acknowledgements)/i
  ];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is a section header
    const isHeader = sectionPatterns.some(pattern => pattern.test(trimmedLine)) &&
                    trimmedLine.length < 60;
    
    if (isHeader) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        title: trimmedLine.replace(/^\d+\.?\s+/, ''),
        content: '',
        level: trimmedLine.match(/^\d+\./) ? 2 : 1
      };
      currentContent = [];
    } else if (currentSection && trimmedLine) {
      currentContent.push(trimmedLine);
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Extract abstract from PDF text
 */
function extractAbstract(text: string): string | undefined {
  const abstractMatch = text.match(
    /abstract[\s:]*\n?([\s\S]*?)(?=\n\s*(introduction|keywords|1\.|background))/i
  );
  
  if (abstractMatch) {
    return abstractMatch[1].trim().replace(/\s+/g, ' ');
  }
  
  return undefined;
}

/**
 * Extract citations/references from PDF text
 */
function extractCitations(text: string): string[] {
  const citations: string[] = [];
  
  // Find references section
  const referencesMatch = text.match(
    /(?:references|bibliography|works cited)[\s:]*\n([\s\S]*?)(?=\n\s*appendix|\n*$)/i
  );
  
  if (!referencesMatch) return citations;
  
  const referencesText = referencesMatch[1];
  
  // Match numbered references
  const numberedRefs = referencesText.match(/\[\d+\][^\[]+/g);
  if (numberedRefs) {
    return numberedRefs.map(ref => ref.trim());
  }
  
  // Match author-year style references
  const lines = referencesText.split('\n').filter(line => line.trim().length > 20);
  return lines.slice(0, 50); // Limit to 50 citations
}

/**
 * Extract and structure a research paper for MINDEX ingestion
 */
export async function processResearchPaper(
  pdfBuffer: Buffer,
  options: {
    extractImages?: boolean;
    useZpdf?: boolean;
    zpdfEndpoint?: string;
  } = {}
): Promise<{
  extraction: PDFExtractionResult;
  markdown: MarkdownConversionResult;
  indexable: {
    title: string;
    abstract: string;
    authors: string[];
    keywords: string[];
    fullText: string;
    sections: string[];
    citations: string[];
    pageCount: number;
    extractedAt: string;
  } | null;
}> {
  // Extract text
  const extraction = await extractTextFromPDF(pdfBuffer, options);
  
  if (!extraction.success) {
    return {
      extraction,
      markdown: { success: false, error: extraction.error },
      indexable: null
    };
  }
  
  // Convert to markdown
  const markdown = convertToMarkdown(extraction);
  
  // Create indexable structure for MINDEX
  const indexable = {
    title: extraction.metadata?.title || 'Untitled',
    abstract: markdown.abstract || '',
    authors: extraction.metadata?.author?.split(/[,;&]/).map(a => a.trim()) || [],
    keywords: extraction.metadata?.keywords || [],
    fullText: extraction.text || '',
    sections: markdown.sections?.map(s => s.title) || [],
    citations: markdown.citations || [],
    pageCount: extraction.pages || 0,
    extractedAt: new Date().toISOString()
  };
  
  return {
    extraction,
    markdown,
    indexable
  };
}

export default {
  extractTextFromPDF,
  convertToMarkdown,
  processResearchPaper
};
