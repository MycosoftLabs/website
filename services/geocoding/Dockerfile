# MINDEX Geocoding Pipeline Service
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY geocoding_service.py .

# Create data directory
RUN mkdir -p /app/data

# Environment variables
ENV REDIS_URL=redis://redis:6379
ENV MINDEX_API_URL=http://mindex-api:8001
ENV GEOCODING_CACHE_PATH=/app/data/geocoding_cache.db
ENV GEOCODING_INTERVAL=300

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import asyncio; asyncio.run(__import__('geocoding_service').GeocodingCache().cleanup_expired())" || exit 1

CMD ["python", "geocoding_service.py"]
