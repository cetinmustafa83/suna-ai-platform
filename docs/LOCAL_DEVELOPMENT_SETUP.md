# Local Development Setup Guide for Suna AI Platform

## Introduction

This guide will walk you through setting up the Suna AI Platform on your local machine for development purposes. This setup is ideal if you plan to contribute to the project, make code changes, or test new features before deployment.

The Suna platform consists of a frontend application, a backend API, a background worker, and several dependent services (like Redis and RabbitMQ). For simplicity and stability, we'll use Docker for dependent services, while running the frontend, backend, and worker directly on your machine.

For data persistence and authentication, this guide will primarily focus on using a **cloud-hosted Supabase project**, as it's generally easier for local development than managing a local Supabase instance. However, guidance for an optional local Supabase setup will also be provided.

## Prerequisites

Before you start, ensure you have the following software installed on your system:

*   **Git:** For cloning the repository. [Download Git](https://git-scm.com/downloads)
*   **Node.js:** Version 18+ is recommended. You can check the `engines` field in `frontend/package.json` if available, or use a Node version manager like `nvm`. [Download Node.js](https://nodejs.org/en/download/)
*   **Python:** Version 3.11+ is recommended. Check `backend/pyproject.toml` for the exact Python version specified for the project. [Download Python](https://www.python.org/downloads/)
*   **Poetry:** The latest version for managing Python backend dependencies. [Poetry Installation Guide](https://python-poetry.org/docs/#installation)
*   **Docker & Docker Compose:** Strongly recommended for running dependent services (Redis, RabbitMQ). [Install Docker Desktop](https://docs.docker.com/get-docker/) or [Docker Engine & Docker Compose for Linux](https://docs.docker.com/engine/install/).
*   **(Optional) Supabase CLI:** Required only if you choose to run Supabase locally. [Supabase CLI Guide](https://supabase.com/docs/guides/cli)
*   **(Optional but Recommended) Visual Studio Code (VS Code):** A popular code editor.
    *   Consider installing recommended extensions listed in `.vscode/extensions.json` for a better development experience.

## Initial Setup

### Step 1: Clone the Repository

1.  Open your terminal.
2.  Clone the Suna AI Platform repository (replace with the official repository URL if different):
    ```bash
    git clone https://github.com/kortix-ai/suna.git suna-ai-platform
    ```
3.  Navigate into the cloned directory:
    ```bash
    cd suna-ai-platform
    ```

### Step 2: Install Core Dependencies

It's recommended to install dependencies for both the backend and frontend.

1.  **Backend Dependencies (Poetry):**
    ```bash
    cd backend
    poetry install
    cd ..
    ```
    This command reads the `poetry.lock` file (or `pyproject.toml` if no lock file exists) and installs the specified Python packages into a virtual environment managed by Poetry.

2.  **Frontend Dependencies (npm):**
    ```bash
    cd frontend
    npm install
    cd ..
    ```
    This command reads the `package.json` and `package-lock.json` files and installs the required Node.js packages into the `node_modules` directory.

*(Note: The project's Makefile might contain a `make dev-setup` or similar target that automates these dependency installations. If so, you can use that as an alternative.)*

### Step 3: Configure Environment Variables

Environment variables are crucial for configuring the application. Suna uses `.env` files for this. You'll need to create these from the provided example files.

1.  **Backend Environment File:**
    *   Navigate to the backend directory: `cd backend`
    *   Copy the example file: `cp .env.example .env`
    *   Open `backend/.env` in your text editor and configure the following variables for local development:

        ```dotenv
        # Environment Mode
        ENV_MODE=local

        # Database (Recommended: Use your Cloud Supabase project details)
        SUPABASE_URL=https://your-project-ref.supabase.co
        SUPABASE_ANON_KEY=your-supabase-anon-key
        SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

        # Redis (assuming Redis will run in Docker and be exposed on localhost)
        REDIS_HOST=localhost
        REDIS_PORT=6379
        REDIS_PASSWORD=
        REDIS_SSL=false # Typically false for local Dockerized Redis

        # RabbitMQ (assuming RabbitMQ will run in Docker and be exposed on localhost)
        RABBITMQ_HOST=localhost
        RABBITMQ_PORT=5672

        # LLM Providers (Required for AI features - use your actual keys)
        ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
        OPENAI_API_KEY=sk-your-openai-key
        # GROQ_API_KEY=
        # OPENROUTER_API_KEY=
        MODEL_TO_USE=anthropic/claude-3-7-sonnet-latest # Or your preferred model

        # Web Search & Scraping (Required for these tools - use your actual keys)
        TAVILY_API_KEY=your-tavily-key
        FIRECRAWL_API_KEY=your-firecrawl-key
        FIRECRAWL_URL=https://api.firecrawl.dev # Default, change if self-hosting Firecrawl

        # Daytona (Agent Execution Environment - use your actual key)
        # This is needed if you intend to test features that deploy to or interact with Daytona.
        # For some local UI/backend tasks not directly involving Daytona, it might not be strictly necessary.
        DAYTONA_API_KEY=your-daytona-key
        DAYTONA_SERVER_URL=https://app.daytona.io/api # Default
        DAYTONA_TARGET=us # Default

        # URL settings
        NEXT_PUBLIC_URL=http://localhost:3000 # Used by backend for links/callbacks

        # Optional: Other keys like LANGFUSE_SECRET_KEY, SENTRY_DSN if you use these services
        LANGFUSE_SECRET_KEY=
        SENTRY_DSN=
        ```
    *   Return to the project root: `cd ..`

2.  **Frontend Environment File:**
    *   Navigate to the frontend directory: `cd frontend`
    *   Copy the example file: `cp .env.example .env.local` (Note: Next.js uses `.env.local` for local overrides)
    *   Open `frontend/.env.local` in your text editor and configure:

        ```dotenv
        # Supabase (Should match the backend Supabase configuration)
        NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co 
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

        # Backend URL
        NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api

        # Public URL for the frontend itself
        NEXT_PUBLIC_URL=http://localhost:3000

        # Environment Mode
        NEXT_PUBLIC_ENV_MODE=LOCAL 
        ```
    *   Return to the project root: `cd ..`

**Important Notes on API Keys:**
*   Even for local development, AI features, search, and web scraping will only work if you provide valid API keys for the respective services (OpenAI, Anthropic, Tavily, Firecrawl, Daytona, etc.).
*   Keep your `.env` files secure and do not commit them to version control (they are typically included in `.gitignore`).

## Running Dependent Services (Redis & RabbitMQ)

For local development, the Suna backend requires Redis (for caching and session management) and RabbitMQ (for message queuing for the worker). The easiest way to run these is using Docker Compose.

The main `docker-compose.yaml` file in the project root is configured to run these services along with the backend and frontend. For local development, we only want Docker to handle Redis and RabbitMQ.

1.  **Navigate to the Project Root:**
    Ensure you are in the `suna-ai-platform` directory (where `docker-compose.yaml` is located).

2.  **Start Redis and RabbitMQ using Docker Compose:**
    ```bash
    docker compose up redis rabbitmq -d
    ```
    *   `redis` and `rabbitmq` are the service names defined in `docker-compose.yaml`.
    *   `-d` runs the containers in detached mode (in the background).

3.  **Verify Services are Running:**
    Check that the containers have started successfully:
    ```bash
    docker ps
    ```
    You should see containers for `redis` and `rabbitmq` in the list with a status indicating they are "Up".

    If you need to check their logs:
    ```bash
    docker compose logs redis
    docker compose logs rabbitmq
    ```

    *Note: The `backend/README.md` also mentions this approach. Ensure your `backend/.env` has `REDIS_HOST=localhost` and `RABBITMQ_HOST=localhost` as these services, when started by Docker Compose from the root `docker-compose.yaml`, are typically exposed to `localhost` on your machine via mapped ports (e.g., 6379 for Redis, 5672 for RabbitMQ).*

## Running the Application

With the dependent services running, you can now start the Suna backend, backend worker, and frontend. It's recommended to run each in a separate terminal tab or window to easily monitor their output.

### Step 1: Start the Backend API

1.  Open a new terminal.
2.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
3.  Start the FastAPI development server using Poetry:
    ```bash
    poetry run uvicorn api:app --reload --host 0.0.0.0 --port 8000
    ```
    *   `uvicorn api:app`: Runs the FastAPI application defined in `api.py`.
    *   `--reload`: Enables auto-reloading when code changes are detected.
    *   `--host 0.0.0.0`: Makes the server accessible from `localhost` and other devices on your local network.
    *   `--port 8000`: Runs on port 8000.

    You should see output indicating the server is running, typically `Uvicorn running on http://0.0.0.0:8000`.

### Step 2: Start the Backend Worker

The worker processes background tasks, such as those initiated by agents.

1.  Open another new terminal.
2.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
3.  Start the Dramatiq worker using Poetry:
    ```bash
    poetry run python3.11 -m dramatiq run_agent_background
    ```
    *(Note: Ensure `python3.11` matches the Python version you are using for the project if it's different, though Poetry should manage this through its environment.)*

    You should see worker logs, indicating it's connected to RabbitMQ and ready for tasks.

### Step 3: Start the Frontend

1.  Open a third new terminal.
2.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
3.  Start the Next.js development server:
    ```bash
    npm run dev
    ```
    This command usually starts the frontend on `http://localhost:3000`. The terminal output will confirm the address.

### Alternative: Using VS Code Tasks (If Configured)

The `DEVELOPMENT_SETUP.md` mentions VS Code tasks. If your project has a well-configured `.vscode/tasks.json` file, you might be able to start these services more easily:

1.  Open the Command Palette in VS Code (Cmd+Shift+P or Ctrl+Shift+P).
2.  Type "Tasks: Run Task".
3.  Look for tasks like:
    *   `Start Backend (Development)`
    *   `Start Worker`
    *   `Start Frontend (Development)`
    *   Or a combined task like `Start All Development Services`.

    Refer to your project's `.vscode/tasks.json` for available task names and their specific actions.

## Accessing the Application

Once all components are running:

*   **Frontend Application:** Open your web browser and go to `http://localhost:3000`.
*   **Backend API:** The API will be running at `http://localhost:8000`.
*   **API Documentation (Swagger UI):** Access interactive API documentation at `http://localhost:8000/docs`.
*   **RabbitMQ Management Interface:** If exposed by the Docker setup in `docker-compose.yaml` (which it is by default), you can access it at `http://localhost:15672` (default credentials are often `guest`/`guest`).

## Database Setup (Supabase)

Suna uses Supabase for its database and authentication. For local development, you have two main options:

### Option 1: Using a Cloud Supabase Project (Recommended)

This is the simplest approach for most local development scenarios, as it avoids managing a local Supabase instance.

1.  **Ensure Correct Configuration:**
    *   Verify that your `backend/.env` and `frontend/.env.local` files have the correct `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for your **cloud-hosted Supabase project**. (These should have been configured in the "Initial Setup > Step 3: Configure Environment Variables" section).

2.  **Apply Database Migrations:**
    Database migrations define the schema (tables, functions, policies) for Suna. The Suna project includes Supabase migrations in the `backend/supabase/migrations` directory.
    *   **If you have run `python setup.py` previously:** The setup script likely handled the initial migration push.
    *   **For a manual local setup or to ensure your database is up-to-date:**
        1.  Ensure the Supabase CLI is installed (see Prerequisites).
        2.  Navigate to the backend directory in your terminal:
            ```bash
            cd backend
            ```
        3.  Log in to the Supabase CLI (if you haven't already):
            ```bash
            supabase login
            ```
            (This will open a browser window to authenticate you).
        4.  Link your local project to your cloud Supabase project (only needs to be done once per machine/project):
            ```bash
            supabase link --project-ref YOUR_PROJECT_REF
            ```
            Replace `YOUR_PROJECT_REF` with the actual reference ID of your Supabase project (found in your Supabase project's dashboard URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`).
        5.  Push the migrations to your cloud database:
            ```bash
            supabase db push
            ```
            This command applies any pending migrations from the `backend/supabase/migrations` folder to your linked Supabase project.

    *   **Important Manual Step (from `setup.py`):**
        As mentioned in the `setup.py` script and `docs/SELF-HOSTING.md`, you might need to manually expose the `basejump` schema in your Supabase project settings for full functionality, especially related to authentication and multi-tenancy features if used.
        *   Go to your Supabase project dashboard on `supabase.com`.
        *   Navigate to **Project Settings** -> **API**.
        *   Under **Schema Settings** -> **Exposed schemas**, ensure `basejump` is listed in addition to `public`. If not, add it.

### Option 2: Using a Local Supabase Instance (Advanced)

This option runs Supabase entirely on your local machine using Docker. It's useful for offline development or if you want full control, but adds complexity.

1.  **Initialize Supabase Locally:**
    *   Ensure the Supabase CLI is installed.
    *   Navigate to the `backend` directory (or wherever you prefer to manage your local Supabase configuration, often within `backend/supabase` if it's structured for that, or `backend` itself):
        ```bash
        cd backend 
        # supabase init # Run this if there's no 'supabase' folder yet from a previous init.
        # It creates a 'supabase' subfolder with local configuration.
        ```
        If the project already has a `backend/supabase` folder with a `config.toml`, you might not need `supabase init`.

2.  **Start Local Supabase Services:**
    From the directory where your local Supabase project is initialized (e.g., `backend` or `backend/supabase`):
    ```bash
    supabase start
    ```
    This will download Supabase Docker images and start the necessary containers (PostgreSQL, GoTrue, Kong, etc.). At the end of the output, it will display local Supabase credentials (API URL, anon key, service role key).

3.  **Configure `.env` Files for Local Supabase:**
    *   Update `backend/.env` and `frontend/.env.local` with the local Supabase details provided by `supabase start`.
        *   `SUPABASE_URL` will typically be `http://localhost:54321` (or as shown in `supabase start` output).
        *   Use the local `anon` and `service_role` keys provided.
        *   `NEXT_PUBLIC_SUPABASE_URL` should also point to the local URL.

4.  **Apply Migrations to Local Supabase:**
    From the directory where your Supabase project is initialized:
    ```bash
    supabase db push
    ```

5.  **Stopping Local Supabase:**
    ```bash
    supabase stop
    ```
    To remove local Supabase data and containers (use with caution): `supabase stop --no-backup`

### Choosing an Option:

*   For most developers, **Option 1 (Cloud Supabase)** is recommended due to its simplicity and lower resource overhead on your local machine.
*   **Option 2 (Local Supabase)** is for those who specifically need an offline or fully isolated environment.

## Initial User Registration

Once your Suna application is running (frontend, backend, worker) and connected to your chosen Supabase instance (cloud or local):

1.  **Access the Frontend:**
    Open your web browser and navigate to `http://localhost:3000`.

2.  **Sign Up:**
    *   Look for the "Sign Up" or "Register" link/button on the Suna application's homepage.
    *   Complete the registration form with your email and password.

3.  **Email Confirmation (If Applicable):**
    *   If using a cloud Supabase project with email confirmations enabled, check your email inbox for a confirmation link. You must click this to activate your account.
    *   Local Supabase instances might use ` uitgenodigd@email.com` for simulated email delivery; check the `supabase start` logs or Supabase Studio (usually `http://localhost:54323`) for these emails.
    *   If you have issues with email delivery from a cloud instance, check your Supabase project's authentication settings and ensure an email provider is configured if needed.

After successful registration (and email confirmation if required), you should be able to log in and start using the Suna platform locally.

## VS Code Debugging (Optional)

If you are using Visual Studio Code, the project may include pre-configured launch configurations to help you debug the application. These are typically found in the `.vscode/launch.json` file. The `DEVELOPMENT_SETUP.md` also mentions debugging capabilities.

### Backend Debugging (Python/FastAPI)

1.  **Ensure you have the Python extension for VS Code installed.**
2.  Open the "Run and Debug" view in VS Code (usually an icon on the left sidebar that looks like a play button with a bug).
3.  Look for a launch configuration named something like "Debug Backend API," "Python: FastAPI," or similar in the dropdown menu.
4.  Set breakpoints in your Python backend code (e.g., in API route handlers, agent logic, etc.).
5.  Start the debugging session (usually by pressing F5 or clicking the green play button).
    *   The backend server will start, and the debugger will attach to it. When code execution hits a breakpoint, it will pause, allowing you to inspect variables, step through code, etc.
    *   Make sure your backend is not already running in another terminal if the debug configuration starts its own server instance.

### Frontend Debugging (Next.js/React)

1.  **Ensure you have the JavaScript Debugger extension for VS Code (usually built-in).**
2.  The `DEVELOPMENT_SETUP.md` suggests using browser developer tools, which is standard for frontend JavaScript.
    *   Run the frontend development server (`npm run dev`).
    *   Open your application in a browser (e.g., Chrome, Firefox).
    *   Open the browser's developer tools (usually by right-clicking and selecting "Inspect" or pressing F12).
    *   You can set breakpoints, inspect the console, view network requests, and analyze component states directly in the browser.
3.  **VS Code Debugger for Node.js (Advanced):**
    *   For debugging server-side rendering aspects of Next.js or specific scripts, you might find or create a launch configuration in `.vscode/launch.json` to attach to the Next.js Node.js process. Consult VS Code and Next.js documentation for more details on this.

Refer to the `.vscode/launch.json` file in the project for specific debug configurations provided by the Suna team.

## Troubleshooting Local Setup

Here are some common issues you might encounter during local development setup and how to address them:

*   **Port Conflicts:**
    *   **Symptom:** Service fails to start, error message like "Port already in use," "Address already in use."
    *   **Check:** `EADDRINUSE` errors in terminal.
    *   **Solution:**
        *   Identify the process using the port: `lsof -i :PORT_NUMBER` (macOS/Linux) or `netstat -ano | findstr :PORT_NUMBER` (Windows).
        *   Stop the conflicting process or change the port for the Suna service in the relevant configuration (e.g., `uvicorn` command for backend, `package.json` script for frontend, or `docker-compose.yaml` for dependent services).

*   **Backend Dependency Issues (Poetry):**
    *   **Symptom:** Errors related to Python packages, `ModuleNotFoundError`, etc.
    *   **Solution:**
        ```bash
        cd backend
        poetry install --no-cache  # Reinstall dependencies cleanly
        # If issues persist, you might try:
        # poetry env remove python  # Or the specific env name like 'suna-ai-platform-py3.11'
        # poetry install
        ```
        Ensure you are inside the Poetry shell (`poetry shell`) or are running commands with `poetry run`.

*   **Frontend Dependency Issues (npm):**
    *   **Symptom:** Errors during `npm install` or when running `npm run dev`, `Module not found` in browser console.
    *   **Solution:**
        ```bash
        cd frontend
        rm -rf node_modules package-lock.json # Or del node_modules package-lock.json on Windows
        npm install
        ```

*   **Incorrect Environment Variables:**
    *   **Symptom:** Authentication failures, API errors, services not connecting to each other or to external services (Supabase, LLMs).
    *   **Solution:** Carefully double-check all variable names and values in `backend/.env` and `frontend/.env.local`. Ensure URLs are correct (e.g., `http://localhost:8000/api` for `NEXT_PUBLIC_BACKEND_URL`). Restart the relevant services after making changes.

*   **Docker Services Not Running (Redis, RabbitMQ):**
    *   **Symptom:** Backend fails to connect to Redis or RabbitMQ.
    *   **Solution:**
        *   Check status: `docker ps`. Ensure `redis` and `rabbitmq` containers are listed and "Up".
        *   Check logs: `docker compose logs redis` or `docker compose logs rabbitmq`.
        *   Ensure Docker Desktop is running or the Docker daemon is active.
        *   Try restarting them: `docker compose restart redis rabbitmq`.

*   **Supabase Connection/Migration Issues:**
    *   **Symptom:** Errors related to database connection, authentication, or data not appearing as expected.
    *   **Solution:**
        *   Verify Supabase URL and keys in `.env` files.
        *   If using cloud Supabase, check its status on `status.supabase.com` and ensure your project is active.
        *   Ensure migrations have been applied correctly (`supabase db push`).
        *   Check Row Level Security (RLS) policies in your Supabase dashboard if data seems to be missing for authenticated users.
        *   Ensure the `basejump` schema is exposed if you encountered related errors.

*   **AI Features Not Working:**
    *   **Symptom:** Agents fail, or AI-powered responses are not generated.
    *   **Solution:**
        *   Verify your LLM API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.) in `backend/.env` are correct and have available quota.
        *   Check `MODEL_TO_USE` is set to a valid model you have access to.
        *   Inspect backend logs for specific error messages from LLM providers.

*   **General Advice:**
    *   Always check the terminal output for specific error messages.
    *   Restart services after making configuration changes.
    *   Consult the main project `README.md` and `docs/SELF-HOSTING.md` for any other relevant information.

This guide should help you get a local development environment for Suna up and running. Happy coding!
