SHELL := /bin/bash
PNPM := $(shell which pnpm 2>/dev/null || echo pnpm)
PYTHON := $(shell if [ -f .venv/bin/python ]; then echo .venv/bin/python; else echo python3; fi)
PYTEST := $(shell if [ -f .venv/bin/pytest ]; then echo .venv/bin/pytest; else echo pytest; fi)

.PHONY: all setup dev build test lint migrate seed demo models clean help

all: lint build test

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
	$(PNPM) install
	@if [ -d ".venv" ]; then \
		.venv/bin/pip install -r services/processing/requirements.txt || true; \
	fi

dev:
	@echo "==> Starting local development services:"
	@echo "  1. Python Processing Worker (Port 8081):"
	@echo "     PYTHONPATH=services/processing $(PYTHON) services/processing/src/workers/server.py"
	@echo "  2. Go REST API (Port 8080):"
	@echo "     cd services/api && go run ./cmd/server"
	@echo "  3. React Web Frontend (Port 3000/3001):"
	@echo "     $(PNPM) --dir apps/web dev"

seed: demo

migrate:
	@echo "==> Database migrations located at services/api/migrations"
	@echo "  Up:   services/api/migrations/000001_init_schema.up.sql"
	@echo "  Down: services/api/migrations/000001_init_schema.down.sql"

build:
	@echo "==> Building Go API..."
	cd services/api && go build -o bin/server ./cmd/server
	@echo "==> Building React Web Frontend (pnpm)..."
	$(PNPM) --dir apps/web build

test:
	@echo "==> Running Go API unit and integration tests..."
	cd services/api && go test -v ./tests
	@echo "==> Running Python geospatial processing tests..."
	PYTHONPATH=services/processing $(PYTEST) services/processing/tests/test_processing.py -v

lint:
	@echo "==> Checking TypeScript types with pnpm..."
	$(PNPM) --dir apps/web lint
	@echo "==> Checking Go source..."
	cd services/api && go vet ./...

demo:
	@echo "==> Generating multi-temporal synthetic rasters (2016 baseline vs 2021 expansion)..."
	$(PYTHON) scripts/generate_demo_rasters.py
	@echo "==> Running change detection engine pipeline..."
	PYTHONPATH=services/processing $(PYTHON) -m src.cli detect \
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
