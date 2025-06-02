# Suna AI Platform Deployment Guide

## Introduction

This guide provides instructions and considerations for deploying the Suna AI Platform to a production or staging environment. It covers the deployment of the backend, frontend, and database, as well as critical security information regarding administrator authentication.

**IMPORTANT:** The local development setup uses mock authentication and an in-browser database (RxDB) for the frontend. These are **NOT SUITABLE** for production and must be replaced with robust, secure solutions as outlined below.

## Prerequisites

Before deploying, ensure you have:
1.  A server or platform to host your backend (e.g., Docker host, Kubernetes cluster, PaaS).
2.  A platform to host your Next.js frontend (e.g., Vercel, Netlify, AWS Amplify, Docker).
3.  A PostgreSQL database instance accessible by your backend.
4.  All necessary API keys and credentials for external services (LLMs, etc.).
5.  Familiarity with managing environment variables and production infrastructure.

## 1. Database Deployment (PostgreSQL)

*   **Setup**: Provision a PostgreSQL database instance from a cloud provider (e.g., AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL, or other managed services) or self-host it.
*   **Connection String**: Securely note down the `DATABASE_URL` connection string. This will be used by the backend.
    *   Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require` (using `sslmode=require` or `verify-full` is highly recommended for production).
*   **Networking**: Ensure your backend deployment environment can securely connect to this database instance (e.g., via VPC peering, firewall rules).

## 2. Backend Deployment

The backend is a FastAPI Python application. Containerization is recommended for deployment.

### 2.1. Using Docker (Recommended)
*   A `backend/Dockerfile` is provided to build a container image for the backend.
*   Build the image: `docker build -t suna-backend:latest ./backend`
*   Push the image to a container registry (e.g., Docker Hub, AWS ECR, Google Artifact Registry).
*   Deploy the image to your chosen container hosting service (e.g., Docker host, Kubernetes, AWS ECS, Google Cloud Run).

### 2.2. Environment Variables (Production)
The following environment variables are crucial for a production backend deployment. **Do NOT use development/mock values in production.**

*   `ENV_MODE="production"` (or `"staging"`)
*   `DATABASE_URL="your_production_postgresql_connection_string"` (from Step 1)
*   `MOCK_AUTH_ENABLED="false"` **(CRITICAL: This MUST be false in production)**
*   **Admin Authentication (Choose ONE and implement securely):**
    *   `JWT_SECRET_KEY="your_very_strong_random_secret_for_hs256"` (If using JWT for admin)
    *   `ADMIN_API_KEY="a_very_strong_random_api_key_for_admin_access"` (If using a simple API key for admin - ensure it's passed securely)
    *   *Note: If using a more complex OAuth or identity provider for admin users, configure its specific variables.*
*   `OPENAI_API_KEY="your_openai_key"`
*   `ANTHROPIC_API_KEY="your_anthropic_key"`
*   `REDIS_HOST="your_production_redis_host"`
*   `REDIS_PORT="your_production_redis_port"`
*   `REDIS_PASSWORD="your_production_redis_password"`
*   `REDIS_SSL="true"` (Recommended for production Redis)
*   Other API keys for services like Tavily, Firecrawl, etc., as needed.
*   `SENTRY_DSN` (Optional, for error tracking)
*   `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` (Optional, for Langfuse integration)

### 2.3. Database Migrations (Prisma)
Before your backend application starts or as part of your deployment pipeline, you need to apply database migrations:
```bash
# If deploying via a container, you might run this in an init container or as a pre-start script
# Ensure your DATABASE_URL environment variable is set correctly in this environment.
poetry run prisma migrate deploy
```
This command applies all pending migrations to your production PostgreSQL database. It does not generate new migration files (use `prisma migrate dev` for that in development).

### 2.4. Running the Application
Use a production-grade ASGI server like Uvicorn with Gunicorn workers:
```bash
# Example: Run directly (adjust for your environment/container setup)
poetry run gunicorn -w 4 -k uvicorn.workers.UvicornWorker api:app --bind 0.0.0.0:8000
```

## 3. Frontend Deployment

The frontend is a Next.js application.

### 3.1. Hosting Platforms
Popular choices include:
*   **Vercel** (Recommended for Next.js, offers seamless deployment from Git)
*   **Netlify**
*   **AWS Amplify**
*   Self-hosting with Node.js or Docker (using the output of `next build`)

### 3.2. Environment Variables (Production)
Configure these in your frontend hosting platform's settings:

*   `NEXT_PUBLIC_ENV_MODE="production"` (or `"staging"`)
*   `NEXT_PUBLIC_BACKEND_URL="your_production_backend_api_url"` (e.g., `https://api.yoursite.com`)
*   `NEXT_PUBLIC_URL="your_production_frontend_url"` (e.g., `https://www.yoursite.com`)
*   Any other `NEXT_PUBLIC_` variables needed for third-party services integrated directly into the frontend.

### 3.3. Build Process
Your hosting platform will typically build the Next.js app using:
```bash
npm run build
```
And then run it using:
```bash
npm run start
```

## 4. 🚨 CRITICAL: Admin Authentication for Production

The local development setup uses a **mock authentication system** for admin users (`MOCK_AUTH_ENABLED=true` in the backend and `LocalAuth` in the frontend). This system is **NOT SECURE AND MUST NOT BE USED IN PRODUCTION.**

**Before deploying to any live environment, you MUST implement a robust and secure authentication mechanism for all admin APIs.**

### Actions Required:
1.  **Choose an Admin Authentication Strategy:**
    *   **Username/Password with Secure Hashing:** Store admin usernames and bcrypt-hashed passwords in your database. Implement login endpoints that validate credentials.
    *   **OAuth/OIDC:** Integrate with an identity provider (e.g., Auth0, Okta, Google Workspace) for admin users.
    *   **API Keys:** If admin access is programmatic or for a very small, trusted set of internal tools, securely generated and managed API keys could be an option (less common for user-facing admin panels).
    *   **JWT-based System:** Implement a secure JWT issuing and validation mechanism for admin users.

2.  **Update Backend Admin Authentication:**
    *   Modify/replace the `get_current_admin_user` dependency in `backend/utils/auth_utils.py`.
    *   This function must be updated to validate real admin credentials (e.g., check a JWT token, validate an API key from a secure header, or verify a session linked to an OAuth login).
    *   Ensure `MOCK_AUTH_ENABLED` is set to `false` in your production backend environment.

3.  **Update Frontend Admin Login (If Applicable):**
    *   If you build an admin login UI, ensure it securely sends credentials to your new backend admin authentication endpoints. The current mock login system (`admin@example.com`) will not work with a production-ready backend admin auth.

**Failure to implement proper admin authentication will leave your admin APIs (and thus your site settings, editable content, and SEO configurations) exposed and vulnerable.**

## 5. General Considerations

*   **HTTPS**: Ensure HTTPS is enforced for both frontend and backend traffic in production. Use SSL/TLS certificates.
*   **CORS**: Configure Cross-Origin Resource Sharing (CORS) correctly in your FastAPI backend (`app.add_middleware(CORSMiddleware, ...)` in `backend/api.py`) to allow requests from your frontend domain. The current setup allows `localhost:3000` and specific Suna domains; adjust `allowed_origins` and `allow_origin_regex` for your production domains.
*   **CI/CD**: Implement a Continuous Integration/Continuous Deployment pipeline for automated testing and deployment.
*   **Logging & Monitoring**: Set up comprehensive logging and monitoring for both backend and frontend applications (e.g., using Sentry, Prometheus, Grafana, or cloud provider tools).
*   **Security Headers**: Implement security-related HTTP headers (e.g., CSP, HSTS, X-Frame-Options) in your frontend and backend responses.
*   **Rate Limiting**: Consider more robust rate limiting for your backend API in production.
*   **Database Backups**: Regularly back up your PostgreSQL database.
*   **Scalability**: Plan for scaling your backend, frontend, and database based on expected load.

This guide provides a starting point. Adapt it to your specific infrastructure and security requirements.
