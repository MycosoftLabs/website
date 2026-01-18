# Mycosoft Security Operations Center - UniFi Security Monitor
FROM python:3.11-slim

LABEL maintainer="Mycosoft Security Team"
LABEL description="24/7 Security Monitoring Service with UniFi Integration"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create log directory
RUN mkdir -p /var/log/mycosoft/security

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY unifi_security_monitor.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV MYCOSOFT_CONFIG_PATH=/opt/mycosoft

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import socket; s=socket.socket(); s.connect(('localhost', 8099)); s.close()" || exit 1

# Run the security monitor
CMD ["python", "unifi_security_monitor.py"]
