# zpdf Service - High-performance PDF text extraction
# Based on https://github.com/Lulzx/zpdf
#
# This service provides a REST API for PDF text extraction using PyMuPDF,
# which provides excellent performance comparable to the Zig-based zpdf library.
#
# Environment Variables:
#   ZPDF_PORT: Port to listen on (default: 8080)
#
# Usage:
#   POST /extract - Extract text from PDF (multipart/form-data with 'file' field)
#   GET /health - Health check endpoint

FROM python:3.11-slim

# Install dependencies for PDF handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy service files
COPY requirements.txt .
COPY server.py .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Environment
ENV ZPDF_PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${ZPDF_PORT}/health || exit 1

CMD ["python", "server.py"]
