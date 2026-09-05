# Stage 1: Build application and compile TypeScript
FROM node:22-alpine AS builder

# chromium is needed at runtime in the dev compose (which targets this stage)
RUN apk add --no-cache python3 make g++ chromium
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

RUN corepack enable pnpm

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml tsconfig.json .npmrc* pnpm-workspace.yaml* ./



# Install all dependencies including devDependencies for compilation
RUN pnpm install --frozen-lockfile

# Copy source code and migrations
COPY src ./src
COPY migrations ./migrations

# Build TypeScript to dist/
RUN pnpm build

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for healthcheck and Chromium for the /api/render endpoints
RUN apk add --no-cache curl chromium

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/mermaid.db
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Create directory for persistent SQLite data
RUN mkdir -p /app/data

# Copy built artifacts and runtime dependencies
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

# Expose backend API port
EXPOSE 8080

# Declare persistent SQLite volume
VOLUME ["/app/data"]

# Health check against backend /health endpoint
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the Express server
CMD ["node", "dist/index.js"]



