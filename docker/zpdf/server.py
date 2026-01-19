"""
zpdf REST API Service

High-performance PDF text extraction service.
Uses PyMuPDF (fitz) as the primary extraction engine, which provides
excellent performance comparable to the Zig-based zpdf library.

Endpoints:
    POST /extract - Extract text from uploaded PDF
    POST /extract-url - Extract text from PDF at URL
    GET /health - Health check
    GET / - API documentation
"""

import os
import time
import logging
from datetime import datetime

import fitz  # PyMuPDF
from flask import Flask, request, jsonify

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('zpdf-service')

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size


def extract_text_from_pdf(pdf_bytes: bytes) -> dict:
    """Extract text and metadata from PDF bytes using PyMuPDF."""
    start_time = time.time()
    
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        metadata = doc.metadata or {}
        
        full_text = []
        page_texts = []
        
        for page_num, page in enumerate(doc):
            page_text = page.get_text("text")
            full_text.append(page_text)
            page_texts.append({
                'page': page_num + 1,
                'text': page_text,
                'char_count': len(page_text)
            })
        
        toc = doc.get_toc()
        processing_time = time.time() - start_time
        
        result = {
            'success': True,
            'text': '\n\n'.join(full_text),
            'pages': len(doc),
            'page_texts': page_texts,
            'metadata': {
                'title': metadata.get('title'),
                'author': metadata.get('author'),
                'subject': metadata.get('subject'),
                'keywords': metadata.get('keywords'),
                'creator': metadata.get('creator'),
                'producer': metadata.get('producer'),
                'creation_date': metadata.get('creationDate'),
                'modification_date': metadata.get('modDate'),
            },
            'toc': [
                {'level': item[0], 'title': item[1], 'page': item[2]}
                for item in toc
            ] if toc else [],
            'processing_time_ms': round(processing_time * 1000, 2),
            'char_count': sum(len(t) for t in full_text),
            'method': 'pymupdf'
        }
        
        doc.close()
        return result
        
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'processing_time_ms': round((time.time() - start_time) * 1000, 2),
            'method': 'pymupdf'
        }


@app.route('/', methods=['GET'])
def index():
    """Return API documentation."""
    return jsonify({
        'name': 'zpdf Service',
        'version': '1.0.0',
        'description': 'High-performance PDF text extraction service',
        'endpoints': {
            'POST /extract': {
                'description': 'Extract text from uploaded PDF',
                'content_type': 'multipart/form-data',
                'params': {'file': 'PDF file (required)'}
            },
            'POST /extract-url': {
                'description': 'Extract text from PDF at URL',
                'content_type': 'application/json',
                'params': {'url': 'URL to PDF file (required)'}
            },
            'GET /health': {'description': 'Health check endpoint'}
        },
        'engine': 'PyMuPDF (fitz)',
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'zpdf',
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/extract', methods=['POST'])
def extract():
    """Extract text from uploaded PDF file."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    pdf_bytes = file.read()
    if len(pdf_bytes) == 0:
        return jsonify({'success': False, 'error': 'Empty file'}), 400
    
    logger.info(f"Extracting text from {file.filename} ({len(pdf_bytes)} bytes)")
    result = extract_text_from_pdf(pdf_bytes)
    
    if result['success']:
        logger.info(f"Extracted {result['char_count']} characters in {result['processing_time_ms']}ms")
        return jsonify(result)
    return jsonify(result), 500


@app.route('/extract-url', methods=['POST'])
def extract_url():
    """Extract text from PDF at URL."""
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({'success': False, 'error': 'URL is required'}), 400
        
        url = data['url']
        
        import urllib.request
        logger.info(f"Fetching PDF from {url}")
        
        req = urllib.request.Request(url, headers={'User-Agent': 'zpdf-service/1.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            pdf_bytes = response.read()
        
        result = extract_text_from_pdf(pdf_bytes)
        if result['success']:
            result['source_url'] = url
            return jsonify(result)
        return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"URL extraction failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('ZPDF_PORT', 8080))
    logger.info(f"Starting zpdf service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
