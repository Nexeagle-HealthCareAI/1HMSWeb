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
# Only ever set on the Dev build (see deploy-web.yml) — powers the "scan a QR, land in a live
# demo" auto-login. Unset (Prod, or Dev before the secrets are configured) means these are
# empty strings, and SecureLogin.tsx's auto-login effect no-ops harmlessly.
ARG VITE_DEMO_LOGIN_EMAIL
ARG VITE_DEMO_LOGIN_PASSWORD
ENV VITE_DEMO_LOGIN_EMAIL=$VITE_DEMO_LOGIN_EMAIL
ENV VITE_DEMO_LOGIN_PASSWORD=$VITE_DEMO_LOGIN_PASSWORD
RUN npm run build:prod

# ───────────────────────── Serve stage ─────────────────────────
FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
