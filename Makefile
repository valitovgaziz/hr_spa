.PHONY: dev dev-front dev-back install install-back install-front build clean docker-build docker-up docker-down

# Запустить всё (фронт + бэк)
dev: dev-back dev-front

# Фронтенд (Vite, порт 3000)
dev-front:
	npm run dev

# Бэкенд (Express, порт 4000)
dev-back:
	cd server && npm run dev

# Установить все зависимости
install: install-front install-back

install-front:
	npm install

install-back:
	cd server && npm install

# Собрать фронт
build:
	npm run build

# Инициализировать БД
db-init:
	cd server && npm run db:init

# Docker
docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-restart: docker-down docker-up

# Очистить
clean:
	npm run clean
