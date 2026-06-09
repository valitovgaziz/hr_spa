.PHONY: dev dev-back install build db-init db-seed docker-up docker-down docker-logs re
# Backend (Express, порт 4000)
dev:
	cd server && npm run dev

install:
	cd server && npm install

build:
	npm run build --no-cache

db-init:
	cd server && npm run db:init

db-seed:
	cd server && npm run db:seed

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

re: docker compose up -d --build
