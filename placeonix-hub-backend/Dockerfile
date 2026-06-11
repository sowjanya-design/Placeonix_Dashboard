# ─── Build stage ──────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Runtime stage ────────────────
FROM node:18-alpine

# Create non-root user for security
RUN addgroup -S placeonix && adduser -S placeonix -G placeonix

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=placeonix:placeonix /app/node_modules ./node_modules
COPY --chown=placeonix:placeonix . .

# Create writable dirs
RUN mkdir -p uploads logs && chown -R placeonix:placeonix uploads logs

USER placeonix

ENV NODE_ENV=production
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
