# Suna AI Platform - Development Makefile

.PHONY: help install dev test lint format clean docker-build docker-up docker-down

# Default target
help:
	@echo "Suna AI Platform - Development Commands"
	@echo "======================================"
	@echo ""
	@echo "Setup Commands:"
	@echo "  install       Install all dependencies"
	@echo "  dev-setup     Set up development environment"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev           Start development servers"
	@echo "  dev-backend   Start backend development server"
	@echo "  dev-frontend  Start frontend development server"
	@echo ""
	@echo "Testing Commands:"
	@echo "  test          Run all tests"
	@echo "  test-backend  Run backend tests"
	@echo "  test-frontend Run frontend tests"
	@echo "  test-e2e      Run end-to-end tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint          Lint all code"
	@echo "  format        Format all code"
	@echo "  type-check    Run type checking"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-build  Build Docker images"
	@echo "  docker-up     Start all services with Docker"
	@echo "  docker-down   Stop all Docker services"
	@echo "  docker-logs   Show Docker logs"
	@echo ""
	@echo "Cleanup Commands:"
	@echo "  clean         Clean build artifacts"
	@echo "  clean-docker  Clean Docker resources"

# Setup Commands
install: install-backend install-frontend
	@echo "✅ All dependencies installed"

install-backend:
	@echo "📦 Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

dev-setup: install
	@echo "🔧 Setting up development environment..."
	@if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; echo "Created backend/.env"; fi
	@if [ ! -f frontend/.env.local ]; then cp frontend/.env.example frontend/.env.local; echo "Created frontend/.env.local"; fi
	@echo "✅ Development environment ready!"
	@echo "📝 Please edit the .env files with your configuration"

# Development Commands
dev:
	@echo "🚀 Starting development servers..."
	@echo "Backend will be available at http://localhost:8000"
	@echo "Frontend will be available at http://localhost:3000"
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	@echo "🐍 Starting backend development server..."
	cd backend && uvicorn api:app --reload --port 8000

dev-frontend:
	@echo "⚛️ Starting frontend development server..."
	cd frontend && npm run dev

# Testing Commands
test: test-backend test-frontend
	@echo "✅ All tests completed"

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && python -m pytest -v

test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm test

test-e2e:
	@echo "🧪 Running end-to-end tests..."
	cd frontend && npm run test:e2e

# Code Quality
lint: lint-backend lint-frontend
	@echo "✅ Linting completed"

lint-backend:
	@echo "🔍 Linting backend code..."
	cd backend && pylint --rcfile=.pylintrc agent/ agentpress/ services/ utils/
	cd backend && black --check .
	cd backend && isort --check-only .

lint-frontend:
	@echo "🔍 Linting frontend code..."
	cd frontend && npm run lint

format: format-backend format-frontend
	@echo "✅ Code formatting completed"

format-backend:
	@echo "🎨 Formatting backend code..."
	cd backend && black .
	cd backend && isort .

format-frontend:
	@echo "🎨 Formatting frontend code..."
	cd frontend && npm run format

type-check:
	@echo "🔍 Running type checks..."
	cd backend && mypy agent/ agentpress/ services/ utils/
	cd frontend && npm run type-check

# Docker Commands
docker-build:
	@echo "🐳 Building Docker images..."
	docker-compose build

docker-up:
	@echo "🐳 Starting all services with Docker..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose down

docker-logs:
	@echo "📋 Showing Docker logs..."
	docker-compose logs -f

# Production Docker
docker-prod:
	@echo "🐳 Starting production environment..."
	docker-compose -f docker-compose.prod.yml up -d

# Database Commands
db-migrate:
	@echo "🗄️ Running database migrations..."
	cd backend && alembic upgrade head

db-reset:
	@echo "🗄️ Resetting database..."
	cd backend && alembic downgrade base && alembic upgrade head

# Cleanup Commands
clean: clean-backend clean-frontend
	@echo "✅ Cleanup completed"

clean-backend:
	@echo "🧹 Cleaning backend artifacts..."
	cd backend && find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	cd backend && find . -name "*.pyc" -delete 2>/dev/null || true
	cd backend && rm -rf .pytest_cache .coverage htmlcov 2>/dev/null || true

clean-frontend:
	@echo "🧹 Cleaning frontend artifacts..."
	cd frontend && rm -rf .next node_modules/.cache 2>/dev/null || true

clean-docker:
	@echo "🧹 Cleaning Docker resources..."
	docker system prune -f
	docker volume prune -f

# Utility Commands
logs-backend:
	@echo "📋 Showing backend logs..."
	tail -f backend/logs/*.log

logs-frontend:
	@echo "📋 Showing frontend logs..."
	cd frontend && npm run logs

# Release Commands
release-patch:
	@echo "🚀 Creating patch release..."
	cd backend && poetry version patch
	cd frontend && npm version patch

release-minor:
	@echo "🚀 Creating minor release..."
	cd backend && poetry version minor
	cd frontend && npm version minor

release-major:
	@echo "🚀 Creating major release..."
	cd backend && poetry version major
	cd frontend && npm version major

# Security Commands
security-check:
	@echo "🔒 Running security checks..."
	cd backend && safety check
	cd frontend && npm audit

# Documentation Commands
docs-serve:
	@echo "📚 Serving documentation..."
	@echo "API docs available at http://localhost:8000/docs"
	cd backend && uvicorn api:app --port 8000

# Health Check
health:
	@echo "🏥 Checking system health..."
	@echo "Backend health:"
	@curl -s http://localhost:8000/health || echo "Backend not running"
	@echo "\nFrontend health:"
	@curl -s http://localhost:3000/api/health || echo "Frontend not running"
