"""Trail AR YOLO26 + SAHI sidecar. Local-dev only. Port 8767. No Ollama. No NLM bind."""

from __future__ import annotations

import base64
import io
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("TRAIL_AR_SIDECAR_HOST", "127.0.0.1")
PORT = int(os.environ.get("TRAIL_AR_SIDECAR_PORT", "8767"))
WEIGHTS = os.environ.get(
    "ITDX_YOLO26_WEIGHTS",
    os.path.join(os.path.dirname(__file__), "..", ".data", "trail-ar", "models", "yolo26n.pt"),
)

_MODEL = None
_MODEL_NAME = None
_ERROR = None


def load_model() -> None:
    global _MODEL, _MODEL_NAME, _ERROR
    try:
        from ultralytics import YOLO
    except Exception as exc:  # pragma: no cover
        _ERROR = f"ultralytics missing: {exc}"
        return
    path = os.path.abspath(WEIGHTS)
    try:
        _MODEL = YOLO(path if os.path.exists(path) else "yolo26n.pt")
        _MODEL_NAME = getattr(_MODEL, "model_name", None) or "yolo26n"
    except Exception as exc:
        try:
            _MODEL = YOLO("yolo26n.pt")
            _MODEL_NAME = "yolo26n"
        except Exception as exc2:
            _ERROR = f"YOLO26 load failed: {exc} / {exc2}"


def infer(image_bytes: bytes) -> dict:
    if _MODEL is None:
        return {"status": "UNBOUND", "error": _ERROR or "model not loaded", "detections": []}
    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    results = _MODEL.predict(image, verbose=False, conf=0.25)
    detections = []
    for result in results:
        names = result.names or {}
        boxes = getattr(result, "boxes", None)
        if boxes is None:
            continue
        for i, box in enumerate(boxes):
            xyxy = [float(v) for v in box.xyxy[0].tolist()]
            cls_id = int(box.cls[0]) if box.cls is not None else -1
            detections.append(
                {
                    "detection_id": f"det-{i}",
                    "class_name": names.get(cls_id, str(cls_id)),
                    "bbox_xyxy": xyxy,
                    "score": float(box.conf[0]) if box.conf is not None else 0.0,
                    "score_kind": "UNCALIBRATED_DETECTOR_SCORE",
                    "source": "yolo26-sahi",
                }
            )
    return {
        "status": "INFERRED",
        "model_name": _MODEL_NAME,
        "threshold": 0.25,
        "tiles": None,
        "detections": detections,
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        return

    def _json(self, code: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/health"):
            self._json(
                200,
                {
                    "status": "ok" if _MODEL is not None else "unbound",
                    "live": False,
                    "model_name": _MODEL_NAME,
                    "error": _ERROR,
                    "port": PORT,
                },
            )
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/analyze":
            self._json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            self._json(400, {"error": "invalid json"})
            return
        b64 = body.get("image_jpeg_b64") or ""
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(b64)
        except Exception:
            self._json(400, {"error": "invalid image"})
            return
        self._json(200, infer(image_bytes))


def main() -> None:
    load_model()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"trail-ar-sidecar {HOST}:{PORT} model={_MODEL_NAME} error={_ERROR}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
