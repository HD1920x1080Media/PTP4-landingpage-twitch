# check=skip=SecretsUsedInArgOrEnv
# Die VITE_-Werte sind bewusst KEINE Geheimnisse: Vite backt sie in das
# Client-Bundle, das ohnehin an jeden Browser ausgeliefert wird (der Supabase
# anon-Key ist ein öffentlicher Client-Key, Schutz übernimmt RLS). Der
# BuildKit-Check SecretsUsedInArgOrEnv ist hier daher ein False-Positive.

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:26-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# Accept build-time env vars (VITE_ prefix → baked into bundle).
# ARG allein landet NICHT in process.env des Build-Prozesses; Vite liest die
# VITE_-Variablen aber aus process.env. Deshalb per ENV durchreichen, sonst
# enthält das Bundle undefinierte Supabase-/Twitch-Werte.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TWITCH_CLIENT_ID
ARG VITE_CHANNEL_NAME
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_TWITCH_CLIENT_ID=$VITE_TWITCH_CLIENT_ID
ENV VITE_CHANNEL_NAME=$VITE_CHANNEL_NAME

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.31.1-alpine3.23-slim AS runner

# SPA-aware nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
