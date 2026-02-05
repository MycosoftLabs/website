"""E2CC Stub Server - Runs on CPU-only VMs"""
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="E2CC Stub", description="Stub for CPU-only deployments")

@app.get("/")
def root():
    return {
        "service": "e2cc-stub",
        "status": "GPU required for full E2CC",
        "message": "This is a stub service. Run full E2CC on a machine with NVIDIA GPU."
    }

@app.get("/health")
def health():
    return {"status": "stub-mode", "gpu": False, "healthy": True}

@app.get("/api/models")
def models():
    return {
        "available_models": [],
        "message": "Models require GPU. Connect to GPU inference server."
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8211)
