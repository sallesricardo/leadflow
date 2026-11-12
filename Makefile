.PHONY: up up-db up-app up-dev down down-db down-app down-dev test

up:
	@export COMPOSE_FILE=docker-compose.yml:docker-compose.full.yml && \
	docker compose up -d

down:
	@export COMPOSE_FILE=docker-compose.yml:docker-compose.full.yml && \
	docker compose down 

up-db:
	@export COMPOSE_FILE=docker-compose.db.yml && \
	docker compose up -d

down-db:
	@export COMPOSE_FILE=docker-compose.db.yml && \
	docker compose down

up-app:
	@export COMPOSE_FILE=docker-compose.yml && \
	docker compose up -d

down-app:
	@export COMPOSE_FILE=docker-compose.yml && \
	docker compose down

up-dev:
	@export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml && \
	docker compose up -d

down-dev:
	@export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml && \
	docker compose down

test:
	docker compose --profile test run --build --rm test-api
	docker compose --profile test run --build --rm test-web
