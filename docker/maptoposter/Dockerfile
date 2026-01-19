# maptoposter Service - Map poster generation
# Based on https://github.com/originalankur/maptoposter
#
# Generates minimalist map posters using OpenStreetMap data.
# Supports 17 themes and customizable radius selection.
#
# Environment Variables:
#   MAP_PORT: Port to listen on (default: 8081)
#
# Usage:
#   POST /generate - Generate map poster
#   GET /themes - List available themes
#   GET /health - Health check endpoint

FROM python:3.11-slim

# Install system dependencies for matplotlib, geopandas, OSMnx
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgeos-dev \
    libproj-dev \
    libgdal-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy service files
COPY requirements.txt .
COPY server.py .
COPY themes.py .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create output directory
RUN mkdir -p /app/output

# Environment
ENV MAP_PORT=8081
ENV MPLBACKEND=Agg

EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${MAP_PORT}/health || exit 1

CMD ["python", "server.py"]
