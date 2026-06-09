# === Build stage ===
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY scripts scripts/
COPY public public/
COPY vite.config.js index.html ./
COPY src src/

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# === Production stage ===
FROM nginx:1.27-alpine

# Копируем конфиг nginx с прокси на API
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранный SPA
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
