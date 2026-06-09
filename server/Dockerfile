FROM node:22-alpine
WORKDIR /app

# Устанавливаем зависимости для сборки (если потребуется)
RUN apk add --no-cache tzdata postgresql-client

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY db db/
COPY routes routes/
COPY services services/
COPY middleware middleware/
COPY scripts scripts/
COPY index.js ./
COPY staff.txt ./

# Ждём PostgreSQL перед стартом
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "index.js"]
