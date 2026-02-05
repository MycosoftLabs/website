# ═══════════════════════════════════════════════════════════════════════════════
# Data Federation Mesh Dockerfile - February 5, 2026
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

# Labels
LABEL maintainer="Mycosoft <admin@mycosoft.com>"
LABEL version="1.0.0"
LABEL description="Data Federation Mesh - Weather Data Access Service"

# Environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DATA_CACHE_DIR=/opt/earth2/data

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libeccodes-dev \
    libeccodes-tools \
    libgeos-dev \
    libhdf5-dev \
    libnetcdf-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application code
COPY data_sources.py .
COPY dfm_server.py .

# Create data directory
RUN mkdir -p /opt/earth2/data && chmod 777 /opt/earth2/data

# Create non-root user
RUN useradd -m -u 1000 dfm && chown -R dfm:dfm /app /opt/earth2
USER dfm

# Expose port
EXPOSE 8310

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8310/health || exit 1

# Run
CMD ["python", "-m", "uvicorn", "dfm_server:app", "--host", "0.0.0.0", "--port", "8310"]
