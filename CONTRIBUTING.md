# Contributing Guidelines

[简体中文](CONTRIBUTING.zh.md) | English

Thank you for contributing to Mermaid Live Editor with Persistent Storage! Please follow these guidelines to keep code quality and documentation consistent.

---

## 1. Development & Git Workflow

- **Branching**:
  - The main repository manages the project root and `packages/mermaid-vault-backend/`.
  - The frontend is included as a Git submodule in `packages/mermaid-vault-frontend/` pointing to your fork.
- **Frontend Changes**:
  - Make edits inside `packages/mermaid-vault-frontend/`.
  - Commit your changes inside `packages/mermaid-vault-frontend/` on the `develop` branch.
  - Return to the root repository and stage the updated submodule pointer (`git add packages/mermaid-vault-frontend`).
- **Backend Changes**:
  - Make edits directly inside `packages/mermaid-vault-backend/` and commit from the root repository.
- **Commit Message Convention**:
  - Format: `<type>(<scope>): <subject>`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Scopes: `backend`, `frontend`, `submodule`, `docs`, `docker`
  - Example: `feat(backend): add health check endpoint`

---

## 2. Bilingual Documentation Synchronization

All project documentation must be maintained in both **English** and **Simplified Chinese**:
- Root documentation: `README.md` (English) ↔ `README.zh.md` (Chinese)
- Backend documentation: `packages/mermaid-vault-backend/README.md` (English) ↔ `packages/mermaid-vault-backend/README.zh.md` (Chinese)
- Contribution guidelines: `CONTRIBUTING.md` (English) ↔ `CONTRIBUTING.zh.md` (Chinese)

Whenever you add, modify, or delete sections in any documentation file, you **must update both language versions simultaneously** to ensure parity.

---

## 3. UI Internationalization (i18n)

- Frontend user-facing texts must remain aligned with the official `mermaid-vault-frontend` upstream style.
- All new UI labels, status text, placeholders, and error messages must be written in standard English.
- Avoid hardcoding non-English strings in frontend source files.

---

## 4. Code Quality & Testing

- **Backend**:
  - TypeScript strict mode (`strict: true`).
  - Run `pnpm test` with Vitest and verify all REST API endpoints.
- **Frontend**:
  - Ensure type checking passes (`pnpm run check` or `svelte-check`).
  - Ensure production build passes (`pnpm build`).
- **Docker**:
  - Verify that `docker compose build` succeeds without errors.

---

## 5. Continuous Integration

- The `CI` workflow (`.github/workflows/ci.yml`) runs automatically on every push to `main` and on every pull request, and can also be triggered manually from the GitHub *Actions* tab.
- It runs the backend test suite and the frontend checks (svelte-check type-check + vitest unit tests) through Docker Compose (`pnpm test` / `pnpm run test:frontend`), then builds the full production Docker image. Push events publish it to GHCR: pushes to `main` produce `:<short-sha>` plus a rolling `:main` tag, and pushing a `v*` tag produces `:<version>` plus a rolling `:latest` tag.
- Frontend Playwright e2e tests (`tests/*.spec.ts`) come from the upstream editor and are intentionally not wired into CI: they require a preview server and Chromium, and several scenarios no longer apply to this fork.
- **Branch protection**: `main` is protected — pull requests cannot merge unless both CI checks (`Tests (Docker Compose)` and `Production image build`) pass. Direct pushes to `main` are still allowed; force pushes and branch deletion are rejected. If the rule ever needs to be re-created, configure it under *Settings → Branches → Branch protection rule*.
- Run the same checks locally before pushing: `pnpm test` (backend tests), `pnpm run test:frontend` (frontend checks), and `pnpm run build:image` (production image).


