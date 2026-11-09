.PHONY: up-local up-prod test

up:
	@export COMPOSE_FILE=docker-compose.yml:docker-compose.full.yml && \
	docker compose up -d

up-db:
	@export COMPOSE_FILE=docker-compose.db.yml && \
	docker compose up -d

up-app:
	@export COMPOSE_FILE=docker-compose.yml && \
	docker compose up -d

up-dev:
	@export COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml && \
	docker compose up -d

test:
	docker compose --profile test run --build --rm test-api
	docker compose --profile test run --build --rm test-web
