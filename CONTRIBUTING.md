# Contributing to satellite-infrastructure-change-ledger

We welcome contributions of all kinds to improve the platform! Here is how to get started:

---

## Development Workflow

1. **Fork and Clone**:

   ```bash
   git clone https://github.com/your-username/satellite-infrastructure-change-ledger.git
   cd satellite-infrastructure-change-ledger
   ```

2. **Setup Local Environment**:

   ```bash
   cp .env.example .env
   make setup
   ```

3. **Create a Feature Branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Run Tests & Linters**:
   Before submitting changes, ensure all automated tests and linters pass:

   ```bash
   # Run both Go API and Python processing tests
   make test

   # Run TypeScript and Go linters
   make lint

   # Run the end-to-end demonstration scenario
   make demo
   ```

5. **Submit a Pull Request**:
   Commit your changes with concise, descriptive messages and open a pull request against the `main` branch.

---

## Contribution Guidelines

- **Real Functionality**: Ensure every new UI action, API endpoint, or processing step is backed by working code, not placeholders.
- **Traceability**: Changes to the ledger or candidate scoring should preserve data provenance and audit revisions.
- **Test Coverage**: Accompany any new Go backend endpoints or Python geospatial pipelines with automated tests in `services/api/tests/` and `services/processing/tests/`.
- **Code Style**:
  - Go: formatted with standard `gofmt` and checked with `go vet`.
  - Python: follow PEP 8 and use type hints.
  - TypeScript / React: pass `pnpm lint` (`tsc --noEmit`).

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.
