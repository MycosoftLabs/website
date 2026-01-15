# MINDEX Audit Logger Service
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY mindex_audit_logger.py .

RUN mkdir -p /app/data

ENV REDIS_URL=redis://redis:6379
ENV MINDEX_API_URL=http://mindex-api:8001
ENV AUDIT_LOG_PATH=/app/data/audit_log.db
ENV SYNC_INTERVAL=60

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import sqlite3; sqlite3.connect('/app/data/audit_log.db').execute('SELECT 1')" || exit 1

CMD ["python", "mindex_audit_logger.py"]
