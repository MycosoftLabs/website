FROM python:3.11-slim

WORKDIR /app

RUN pip install fastapi uvicorn httpx pydantic

COPY server.py .

EXPOSE 8210

CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8210"]
