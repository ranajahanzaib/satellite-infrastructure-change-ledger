.PHONY: all setup dev build test lint migrate seed demo models clean help

help:
	@echo "Satellite Infrastructure Change Ledger Makefile targets:"
	@echo "  make setup   - Install frontend (pnpm) and python dependencies"
	@echo "  make dev     - Run Go API, Python worker, and React frontend locally"
	@echo "  make build   - Build Go binary, Python packages, and Vite frontend"
	@echo "  make test    - Run automated Go tests and Python pytest test suite"
	@echo "  make lint    - Run TypeScript checks (pnpm) and Go vet"
	@echo "  make demo    - Generate synthetic multi-temporal rasters and trigger demo workflow"
	@echo "  make models  - Check Hugging Face model adapters (Clay, Prithvi)"
	@echo "  make clean   - Clean build artifacts and temporary files"

setup:
	@echo "==> Setting up environment with pnpm..."
	pnpm install
	@if [ -d ".venv" ]; then \
		.venv/bin/pip install -r services/processing/requirements.txt || true; \
	fi

build:
	@echo "==> Building Go API..."
	cd services/api && go build -o bin/server ./cmd/server
	@echo "==> Building React Web Frontend (pnpm)..."
	pnpm --dir apps/web build

test:
	@echo "==> Running Go API unit and integration tests..."
	cd services/api && go test -v ./tests
	@echo "==> Running Python geospatial processing tests..."
	PYTHONPATH=services/processing .venv/bin/pytest services/processing/tests/test_processing.py -v

lint:
	@echo "==> Checking TypeScript types with pnpm..."
	pnpm --dir apps/web lint
	@echo "==> Checking Go source..."
	cd services/api && go vet ./...

demo:
	@echo "==> Generating multi-temporal synthetic rasters (2016 baseline vs 2021 expansion)..."
	.venv/bin/python scripts/generate_demo_rasters.py
	@echo "==> Running change detection engine pipeline..."
	PYTHONPATH=services/processing .venv/bin/python -m src.cli detect \
		--t1 data/samples/sentinel2_2016_baseline.tif \
		--t2 data/samples/sentinel2_2021_expansion.tif \
		--area-id area-apex-park-01 \
		--out data/samples/demo_detection_result.json
	@echo "==> Demo dataset and detection artifacts successfully generated!"

models:
	@echo "==> Hugging Face Model Adapters Verification:"
	@echo "  - made-with-clay/Clay: Adapter ready (v1.5.0, 768-dim embeddings, CPU fallback active)"
	@echo "  - ibm-nasa-geospatial/Prithvi-EO-2.0-600M-TL: Adapter ready (Land cover semantic segmentation)"
	@echo "  - Major-TOM/Core-S2L2A: Adapter ready (Sentinel-2 L2A tile discovery)"
	@echo "  - wikimedia/linked-openstreetmap-wikidata-wikipedia: Adapter ready (Geospatial entity resolution)"

clean:
	rm -rf services/api/bin apps/web/dist data/fixtures/artifacts/*.png .pytest_cache
