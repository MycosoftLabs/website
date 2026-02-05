# ═══════════════════════════════════════════════════════════════════════════════
# Earth2Studio Inference Service Dockerfile - February 5, 2026
# 
# NVIDIA GPU-enabled container for AI weather model inference
# Base: NVIDIA PyTorch container with CUDA 12.4
# ═══════════════════════════════════════════════════════════════════════════════

FROM nvcr.io/nvidia/pytorch:24.03-py3

# Build arguments
ARG DEBIAN_FRONTEND=noninteractive
ARG EARTH2STUDIO_VERSION=0.12.1

# Labels
LABEL maintainer="Mycosoft <admin@mycosoft.com>"
LABEL version="1.0.0"
LABEL description="NVIDIA Earth-2 Inference Service"

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    EARTH2STUDIO_CACHE=/opt/earth2/models \
    DATA_CACHE_DIR=/opt/earth2/data \
    MODEL_CACHE_DIR=/opt/earth2/models \
    TORCH_HOME=/opt/earth2/torch

# Create app user and directories
RUN useradd -m -u 1000 earth2 && \
    mkdir -p /opt/earth2/{models,data,torch,logs} && \
    chown -R earth2:earth2 /opt/earth2

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libeccodes-dev \
    libeccodes-tools \
    libgeos-dev \
    libproj-dev \
    libhdf5-dev \
    libnetcdf-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

# Install Earth2Studio from GitHub
RUN pip install "earth2studio @ git+https://github.com/NVIDIA/earth2studio.git@${EARTH2STUDIO_VERSION}"

# Install optional model dependencies (these may take a while to compile)
RUN pip install --no-cache-dir \
    natten \
    timm \
    torch-harmonics \
    einops \
    flash-attn --no-build-isolation || true

# Copy application code
COPY inference_server.py .

# Switch to non-root user
USER earth2

# Expose port
EXPOSE 8300

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8300/health || exit 1

# Run the server
CMD ["python", "-m", "uvicorn", "inference_server:app", "--host", "0.0.0.0", "--port", "8300"]
