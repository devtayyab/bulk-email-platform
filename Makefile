# Makefile for Bulk Email Platform

.PHONY: help setup dev prod build test clean logs deploy deploy-aws

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development
setup: ## Install dependencies for both frontend and backend
	cd backend && npm install
	cd ../frontend && npm install

dev: ## Start development environment
	docker-compose up -d postgres redis
	cd backend && npm run start:dev &
	cd ../frontend && npm run dev

# Production
build: ## Build both frontend and backend
	cd backend && npm run build
	cd ../frontend && npm run build

prod: ## Start production environment
	docker-compose up -d

stop: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

# Database
db-up: ## Start only database services
	docker-compose up -d postgres redis

db-reset: ## Reset database (WARNING: This will delete all data)
	docker-compose down -v
	docker-compose up -d postgres
	@echo "Database has been reset. You may need to run migrations."

# Logs
logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-db: ## Show database logs
	docker-compose logs -f postgres

# Maintenance
clean: ## Clean up containers, volumes, and images
	docker-compose down -v --rmi all
	docker system prune -f

clean-logs: ## Clean up log files
	truncate -s 0 docker-compose.log 2>/dev/null || true

# Testing
test: ## Run tests for backend
	cd backend && npm run test

test-e2e: ## Run end-to-end tests
	cd backend && npm run test:e2e

# Deployment
deploy: ## Deploy to production environment
	@echo "Building and deploying application..."
	make build
	docker-compose up -d --build
	@echo "Deployment completed. Check logs with 'make logs'"

deploy-aws: ## Deploy to AWS EC2 (requires AWS CLI configured)
	@chmod +x deploy-aws.sh
	./deploy-aws.sh

# Health checks
health: ## Check health of all services
	@echo "Checking service health..."
	@curl -f http://localhost:3000/health || echo "Frontend health check failed"
	@curl -f http://localhost:3001/health || echo "Backend health check failed"
	@echo "Health checks completed"

# Backup
backup: ## Create database backup
	docker-compose exec postgres pg_dump -U postgres bulk_email_platform > backup_$$(date +%Y%m%d_%H%M%S).sql

# Environment
env-dev: ## Copy development environment files
	cp backend/.env.example backend/.env
	cp frontend/.env.example frontend/.env

env-prod: ## Copy production environment files
	cp .env .env.backup
	cp backend/.env.example backend/.env
	cp frontend/.env.example frontend/.env
	@echo "Please edit the .env files with your production values"

# Docker
docker-build: ## Build Docker images
	docker-compose build

docker-push: ## Push images to registry (configure DOCKER_REGISTRY first)
	@echo "Pushing images to $(DOCKER_REGISTRY)..."
	docker tag bulk-email-frontend $(DOCKER_REGISTRY)/bulk-email-frontend:latest
	docker tag bulk-email-backend $(DOCKER_REGISTRY)/bulk-email-backend:latest
	docker push $(DOCKER_REGISTRY)/bulk-email-frontend:latest
	docker push $(DOCKER_REGISTRY)/bulk-email-backend:latest
