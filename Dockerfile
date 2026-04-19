# ─── Stage 1: Builder ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for tsc)
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files
COPY . .

# Compile TypeScript → dist/
RUN npx tsc --build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Only install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]
