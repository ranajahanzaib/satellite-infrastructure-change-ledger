"""
Processing Worker HTTP Service.
Provides REST API endpoints for the Go backend to trigger raster inspection,
temporal alignment, embedding inference, and candidate change detection.
"""

from __future__ import annotations
import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any

try:
    from .pipeline import ProcessingPipeline
    from ..raster.geotiff import RasterIO
except (ImportError, ValueError):
    from src.workers.pipeline import ProcessingPipeline
    from src.raster.geotiff import RasterIO


pipeline = ProcessingPipeline()


def resolve_path(p: str) -> str:
    if os.path.exists(p):
        return p
    for parent in ("..", "../..", "../../..", "../../../.."):
        cand = os.path.normpath(os.path.join(parent, p))
        if os.path.exists(cand):
            return cand
    return p


class ProcessingHandler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, data: Dict[str, Any]):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/health", "/ready"):
            self._send_json(200, {
                "status": "healthy",
                "service": "processing-worker",
                "adapters": {
                    "clay": "ready",
                    "prithvi": "ready",
                    "major_tom": "ready",
                    "osm_wikidata": "ready"
                }
            })
        else:
            self._send_json(404, {"error": "Endpoint not found"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        payload = {}
        if body:
            try:
                payload = json.loads(body.decode("utf-8"))
            except Exception as e:
                self._send_json(400, {"error": f"Invalid JSON payload: {e}"})
                return

        if self.path == "/api/v1/processing/inspect":
            filepath = resolve_path(payload.get("filepath", ""))
            if not filepath or not os.path.exists(filepath):
                self._send_json(400, {"error": "Invalid or missing 'filepath'"})
                return
            try:
                _, meta = RasterIO.read(filepath)
                self._send_json(200, {"status": "ok", "metadata": meta.to_dict()})
            except Exception as e:
                self._send_json(500, {"error": str(e)})

        elif self.path in ("/api/v1/processing/detect", "/api/v1/processing/compare"):
            t1_path = resolve_path(payload.get("t1_path", "data/samples/sentinel2_2016_baseline.tif"))
            t2_path = resolve_path(payload.get("t2_path", "data/samples/sentinel2_2021_expansion.tif"))
            area_id = payload.get("area_id", "area-apex-park-01")
            t1_date = payload.get("t1_date", "2016-08-15")
            t2_date = payload.get("t2_date", "2021-07-10")
            job_id = payload.get("job_id")

            if not os.path.exists(t1_path) or not os.path.exists(t2_path):
                self._send_json(400, {
                    "error": f"One or both raster paths do not exist: {t1_path}, {t2_path}"
                })
                return

            try:
                result = pipeline.run_detection_pipeline(
                    t1_raster_path=t1_path,
                    t2_raster_path=t2_path,
                    area_id=area_id,
                    t1_date=t1_date,
                    t2_date=t2_date,
                    job_id=job_id,
                )
                self._send_json(200, result)
            except Exception as e:
                self._send_json(500, {"error": f"Processing failure: {e}"})

        else:
            self._send_json(404, {"error": "Endpoint not found"})

    def log_message(self, format, *args):
        # Clean structured logging to stdout
        sys.stdout.write(f"[ProcessingWorker] {self.address_string()} - {format % args}\n")


def run_server(port: int = 8081, host: str = "0.0.0.0"):
    server = HTTPServer((host, port), ProcessingHandler)
    print(f"Satellite Change Ledger Processing Worker listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    port = int(os.environ.get("PROCESSING_PORT", "8081"))
    run_server(port=port)
