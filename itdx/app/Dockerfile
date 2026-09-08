FROM python:3.12-slim
WORKDIR /app
COPY requirements-optional.txt ./
RUN pip install --no-cache-dir -r requirements-optional.txt && useradd --uid 10001 --create-home itdx
COPY --chown=itdx:itdx . /app
RUN mkdir -p /data && chown itdx:itdx /data
USER itdx
ENV PYTHONUNBUFFERED=1
EXPOSE 8765
CMD ["python", "service.py", "--host", "0.0.0.0", "--port", "8765", "--data-dir", "/data"]
