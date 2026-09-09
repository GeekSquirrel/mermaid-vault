# ==============================================
# Base stage: Install dependencies in workspace
# ==============================================
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && \
    corepack prepare pnpm@12.3.4 --activate

# Install build dependencies for native modules (better-sqlite3) and git
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc* ./
COPY packages/mermaid-vault-backend/package.json ./packages/mermaid-vault-backend/
COPY packages/mermaid-vault-frontend/package.json ./packages/mermaid-vault-frontend/

# Install dependencies with pnpm cache mount (builds better-sqlite3 and esbuild)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ==============================================
# Stage 1: Build frontend
# ==============================================
FROM base AS frontend-builder
WORKDIR /app
COPY packages/mermaid-vault-frontend ./packages/mermaid-vault-frontend
# SvelteKit static build outputs to packages/mermaid-vault-frontend/docs
RUN pnpm --filter mermaid-vault-frontend build

# ==============================================
# Stage 2: Build backend (compile TypeScript)
# ==============================================
FROM base AS backend-builder
WORKDIR /app
COPY packages/mermaid-vault-backend ./packages/mermaid-vault-backend
RUN pnpm --filter mermaid-vault-backend build

# ==============================================
# Stage 3: Production runtime image (single container)
# ==============================================
FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_URL=/app/data/mermaid.db
ENV DB_PATH=/app/data/mermaid.db
ENV CHROMIUM_PATH=/usr/bin/chromium

# Install runtime dependencies: curl (health check) and Chromium (diagram rendering)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    chromium \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Create persistent storage directory
RUN mkdir -p /app/data

# Copy workspace node_modules (preserving pnpm virtual store symlink structure)
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/mermaid-vault-backend/node_modules ./packages/mermaid-vault-backend/node_modules

# Copy backend application
COPY --from=backend-builder /app/packages/mermaid-vault-backend/package.json ./packages/mermaid-vault-backend/package.json
COPY --from=backend-builder /app/packages/mermaid-vault-backend/dist ./packages/mermaid-vault-backend/dist
COPY --from=backend-builder /app/packages/mermaid-vault-backend/migrations ./packages/mermaid-vault-backend/migrations

# Copy frontend static build artifacts to backend public directory
COPY --from=frontend-builder /app/packages/mermaid-vault-frontend/docs ./packages/mermaid-vault-backend/dist/public

WORKDIR /app/packages/mermaid-vault-backend

EXPOSE 8080

VOLUME ["/app/data"]

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/index.js"]
