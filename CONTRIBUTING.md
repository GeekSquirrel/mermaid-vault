# Contributing Guidelines

[简体中文](CONTRIBUTING.zh.md) | English

Thank you for contributing to Mermaid Live Editor with Persistent Storage! Please follow these guidelines to keep code quality and documentation consistent.

---

## 1. Development & Git Workflow

- **Branching**:
  - The main repository manages the project root and `backend/`.
  - The frontend is included as a Git submodule in `mermaid-live-editor/` pointing to your fork.
- **Frontend Changes**:
  - Make edits inside `mermaid-live-editor/`.
  - Commit your changes inside `mermaid-live-editor/` on the `develop` branch.
  - Return to the root repository and stage the updated submodule pointer (`git add mermaid-live-editor`).
- **Backend Changes**:
  - Make edits directly inside `backend/` and commit from the root repository.
- **Commit Message Convention**:
  - Format: `<type>(<scope>): <subject>`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Scopes: `backend`, `frontend`, `submodule`, `docs`, `docker`
  - Example: `feat(backend): add health check endpoint`

---

## 2. Bilingual Documentation Synchronization

All project documentation must be maintained in both **English** and **Simplified Chinese**:
- Root documentation: `README.md` (English) ↔ `README.zh.md` (Chinese)
- Backend documentation: `backend/README.md` (English) ↔ `backend/README.zh.md` (Chinese)
- Contribution guidelines: `CONTRIBUTING.md` (English) ↔ `CONTRIBUTING.zh.md` (Chinese)

Whenever you add, modify, or delete sections in any documentation file, you **must update both language versions simultaneously** to ensure parity.

---

## 3. UI Internationalization (i18n)

- Frontend user-facing texts must remain aligned with the official `mermaid-live-editor` upstream style.
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


