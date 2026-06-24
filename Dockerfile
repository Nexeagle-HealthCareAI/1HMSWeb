# ───────────────────────── Build stage ─────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm ci

# Build the SPA. VITE_API_BASE_URL is baked in at build time — it CANNOT be
# changed at runtime, so the image is environment-specific (dev vs prod).
# A real env var takes precedence over .env.production in Vite.
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build:prod

# ───────────────────────── Serve stage ─────────────────────────
FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
