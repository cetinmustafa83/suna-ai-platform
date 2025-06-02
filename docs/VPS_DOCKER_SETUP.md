# Suna AI Platform: VPS Docker Deployment Guide

## Introduction

This guide provides step-by-step instructions for deploying the Suna AI Platform to a Virtual Private Server (VPS) using Docker and Docker Compose. It aims to be a complete and flawless ("tam ve eksiksiz") guide for a full setup.

We will leverage the interactive setup script (`setup.py`) provided with the project and supplement it with VPS-specific considerations. For details on obtaining API keys and understanding core components, this guide should be used in conjunction with the existing [Self-Hosting Guide](docs/SELF-HOSTING.md).

## Prerequisites

Before you begin, ensure you have the following:

1.  **A Virtual Private Server (VPS):**
    *   Sufficient resources (CPU, RAM, Disk Space) for running the platform. Refer to `backend/docker-compose.prod.yml` for production resource limit examples.
    *   A modern Linux distribution (e.g., Ubuntu 20.04 LTS or newer).
    *   Root or sudo access.
2.  **Docker and Docker Compose:**
    *   Installed on your VPS. Follow the official Docker installation instructions for your Linux distribution.
    *   Ensure the Docker daemon is running.
3.  **Git:**
    *   Installed on your VPS (`sudo apt update && sudo apt install git -y`).
4.  **Required Accounts and API Keys:**
    *   **Supabase Account:** For database and authentication.
        *   Project URL
        *   `anon` key
        *   `service_role` key
    *   **Daytona Account:** For secure agent execution.
        *   Daytona API Key
        *   You will also need to create a Daytona Image named `kortix/suna:0.1.2.8` with entrypoint `/usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf` as prompted by the `setup.py` script.
    *   **LLM Provider Account(s):** At least one is required.
        *   OpenAI API Key
        *   Anthropic API Key
        *   OpenRouter API Key (optional, can provide access to various models)
        *   (Other providers as supported by Suna)
    *   **Tavily Account:** For enhanced search capabilities.
        *   Tavily API Key
    *   **Firecrawl Account:** For web scraping capabilities.
        *   Firecrawl API Key (and custom URL if self-hosting Firecrawl)
    *   **(Optional) RapidAPI Account:** For accessing additional data provider APIs.
        *   RapidAPI Key
5.  **(Optional but Recommended) Domain Name:**
    *   If you plan to access your Suna instance via a domain name and enable SSL/TLS.

## Step 1: Clone Repository and Initial Setup

1.  **Connect to your VPS:**
    Log in to your VPS via SSH:
    ```bash
    ssh your_username@your_vps_ip_address
    ```

2.  **Clone the Suna AI Platform Repository:**
    Clone the project to your desired location (e.g., `/opt/suna` or home directory):
    ```bash
    git clone https://github.com/cetinmustafa83/suna-ai-platform.git suna
    cd suna
    ```
    *(Note: The original issue mentioned `cetinmustafa83/suna-ai-platform`. If the repository is elsewhere, please adjust the URL. The current setup uses `kortix-ai/suna` in some places like `SELF-HOSTING.md` and `setup.py` refers to `kortix/suna:0.1.2.8` for Daytona. This guide will assume the official Suna repository is the target.)*

## Step 2: Run the Interactive Setup Wizard (`setup.py`)

The Suna AI Platform comes with an interactive setup script (`setup.py`) that automates much of the configuration process.

1.  **Navigate to the Repository Root:**
    If you're not already there, ensure you are in the `suna` directory (or whatever you named the cloned repository folder).
    ```bash
    cd /path/to/suna
    ```

2.  **Run the Setup Script:**
    Execute the script using Python 3:
    ```bash
    python3 setup.py
    ```
    *(Note: The script might attempt to check for local installations of Node.js, Poetry, etc. These are generally used by the script for tasks like dependency installation before the Dockerized environment takes over. Ensure your VPS has `python3` and `pip3` at a minimum for the script to run smoothly. The script itself aims to check for these.)*

3.  **Follow the Interactive Prompts:**
    The script will guide you through several configuration steps. Have your API keys and service information ready. It will ask for:
    *   **Supabase Details:** Project URL, anon key, and service role key.
    *   **Daytona Details:** Daytona API key.
    *   **LLM Provider API Keys:** For OpenAI, Anthropic, OpenRouter, etc. You must configure at least one.
    *   **Search and Web Scraping API Keys:** Tavily API key and Firecrawl API key (plus Firecrawl URL if self-hosted).
    *   **(Optional) RapidAPI Key.**

4.  **Crucial Manual Interventions During `setup.py`:**
    Pay close attention to the script's output. You will be required to perform a few manual steps in your web browser:

    *   **Supabase Schema Exposure:**
        The script will prompt you at the appropriate time:
        > "IMPORTANT: You need to manually expose the 'basejump' schema in Supabase"
        > "Go to the Supabase web platform -> choose your project -> Project Settings -> Data API"
        > "In the 'Exposed Schema' section, add 'basejump' if not already there"
        **Do not skip this step.**

    *   **Daytona Image Creation:**
        The script will instruct you:
        > "Visit https://app.daytona.io/ to create one"
        > "Then, generate an API key from 'Keys' menu"
        > "After that, go to Images (https://app.daytona.io/dashboard/images)"
        > "Click '+ Create Image'"
        > "Enter 'kortix/suna:0.1.2.8' as the image name"
        > "Set '/usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf' as the Entrypoint"
        **This step is critical for agent execution.**

5.  **Dependency Installation:**
    The script will offer to install frontend (`npm install`) and backend (`poetry install`) dependencies. Allow it to do so. These are installed in the local environment on the VPS and some parts might be used during the Docker image build process.

6.  **Starting Suna - Choose Docker Compose:**
    Towards the end, the script will ask how you want to start Suna:
    > "How would you like to start Suna?"
    > "[1] Docker Compose (recommended, starts all services)"
    > "[2] Manual startup (requires Redis, RabbitMQ & separate terminals)"
    **Choose option `[1]` for Docker Compose.** The script will then attempt to run `docker compose up -d --build`.

    If the script completes this successfully, Suna might be running. However, we have further VPS-specific configurations in the next steps, so we will verify and potentially restart the services.

## Step 3: Post-`setup.py` Configuration for VPS

After the `setup.py` script finishes (especially if it ran `docker compose up -d --build`), some configurations might be set to `localhost`. For a VPS, you'll need to adjust these to your public IP address or domain name.

1.  **Stop Services (If Running):**
    If `setup.py` started the Docker services, stop them for now so you can safely edit configuration files:
    ```bash
    docker compose down
    ```
    *(If you encounter issues with this command, you might need to specify the compose files: `docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml down`)*

2.  **Verify and Update Environment Variables:**
    The `setup.py` script creates/updates `.env` files for the backend and frontend. You MUST review and modify these for your VPS.

    *   **Backend Environment File (`backend/.env`):**
        Open this file with a text editor (e.g., `nano backend/.env`).
        Locate the `NEXT_PUBLIC_URL` variable. It might be set to `http://localhost:3000`.
        Change it to your VPS's public URL, including the scheme (http or https if you plan to set up SSL later) and port (if not standard 80/443):
        ```env
        NEXT_PUBLIC_URL=http://your-vps-ip-or-domain:3000 
        # Or if using SSL and standard port for frontend:
        # NEXT_PUBLIC_URL=https://your-domain.com 
        ```
        Review other variables, but `NEXT_PUBLIC_URL` is critical here.

    *   **Frontend Environment File (`frontend/.env.local`):**
        Open this file (e.g., `nano frontend/.env.local`).
        Modify the following variables:
        ```env
        NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co # Should be correct from setup.py
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key # Should be correct from setup.py
        
        # Update this to your public backend URL
        NEXT_PUBLIC_BACKEND_URL=http://your-vps-ip-or-domain:8000/api 
        # Or if using SSL and standard port for backend through a reverse proxy:
        # NEXT_PUBLIC_BACKEND_URL=https://your-domain.com/api

        # Update this to your public frontend URL
        NEXT_PUBLIC_URL=http://your-vps-ip-or-domain:3000
        # Or if using SSL and standard port for frontend:
        # NEXT_PUBLIC_URL=https://your-domain.com

        NEXT_PUBLIC_ENV_MODE=LOCAL # For production, you might consider changing this to PRODUCTION if specific logic depends on it, though typically it's for build-time flags. For Suna, 'LOCAL' might control certain development features; consult project docs if behavior is unexpected.
        ```
        **Important:** Ensure `NEXT_PUBLIC_BACKEND_URL` correctly points to where your backend API will be accessible from the public internet. If you are using a reverse proxy (Step 7), this URL will be your domain.

3.  **Review Docker Compose Configuration for Production:**
    The main `docker-compose.yaml` file defines the services. For production, the Suna project provides `backend/docker-compose.prod.yml`, which specifies resource limits. The `README.md` and `backend/README.md` suggest using both for production.

    The `setup.py` script by default attempts to run `docker compose up -d --build` which uses the default `docker-compose.yaml`. We will use the production-recommended command in the next step.

    *   **Port Mappings:** Open `docker-compose.yaml` (e.g., `nano docker-compose.yaml`).
        By default, the frontend (`frontend` service) is mapped to port `3000` and the backend (`backend` service) to port `8000`.
        ```yaml
        services:
          # ...
          backend:
            # ...
            ports:
              - "8000:8000" # Host:Container
            # ...
          frontend:
            # ...
            ports:
              - "3000:3000" # Host:Container
            # ...
        ```
        If these ports are already in use on your VPS, or you prefer different ports, you can change the host part (the first number). For example, to run the frontend on port `80` externally: `- "80:3000"`. However, running directly on port 80 is often better handled by a reverse proxy (Step 7).

    *   **Resource Limits:** The file `backend/docker-compose.prod.yml` contains resource limit configurations.
        ```yaml
        services:
          api: # This should likely be 'backend' to match docker-compose.yaml
            deploy:
              resources:
                limits:
                  cpus: "14"
                  memory: 48G
                reservations:
                  cpus: "8"
                  memory: 32G
          # ... and so on for worker, redis, rabbitmq
        ```
        **Note:** The service names in `backend/docker-compose.prod.yml` (e.g., `api`, `worker`) must match the service names in your main `docker-compose.yaml` (e.g., `backend`, `worker`). If they differ (like `api` vs `backend`), `docker compose` might not apply the overrides correctly or might try to start new, separate services.
        Adjust these limits based on your VPS resources. If your `docker-compose.yaml` uses `backend` for the main API service, you might need to adjust `backend/docker-compose.prod.yml` to use `backend` instead of `api` for the resource limits to apply correctly when using both files. For this guide, we'll assume the names in `docker-compose.prod.yml` are correct or have been aligned by the user if necessary.

## Step 4: Building and Starting Docker Containers

With the environment variables and Docker configurations reviewed and updated for your VPS, you can now build the Docker images (if they weren't fully built by `setup.py` or if you made changes) and start all the Suna services.

1.  **Ensure you are in the Suna root directory:**
    Where your main `docker-compose.yaml` file is located.
    ```bash
    cd /path/to/suna
    ```

2.  **Build and Start Services:**
    Use the following command to launch the Suna platform. This command merges the base `docker-compose.yaml` with the production resource configurations from `backend/docker-compose.prod.yml`, builds images as needed, and runs containers in detached mode (`-d`).

    ```bash
    docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml up -d --build
    ```

    *   `--build`: Forces Docker to build the images before starting containers. This is good for the first run or after code/configuration changes.
    *   `-d`: Runs containers in detached mode (in the background).

3.  **Monitor Initial Startup (Optional but Recommended):**
    You can watch the logs of all services to see if they start up correctly:
    ```bash
    docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml logs -f
    ```
    Look for any error messages. Press `Ctrl+C` to stop viewing logs.
    To view logs for a specific service, e.g., the backend:
    ```bash
    docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml logs -f backend 
    # Or 'frontend', 'worker', 'redis', 'rabbitmq'
    ```

    It might take a few minutes for all services to initialize, especially the first time as images are built and databases might be initialized.

## Step 5: Initial Admin User Registration

Once the Suna platform services are running, you can create your first user account. This account will typically be used to manage the platform. The `setup.py` script's final instructions state: "Create an account using Supabase authentication to start using Suna."

1.  **Access the Suna Frontend:**
    Open your web browser and navigate to the public URL you configured for the frontend in `frontend/.env.local` (the `NEXT_PUBLIC_URL` variable). This would be something like:
    *   `http://your-vps-ip-or-domain:3000`
    *   `https://your-domain.com` (if you set up a reverse proxy with SSL and are using standard ports)

2.  **Sign Up:**
    *   On the Suna homepage, look for a "Sign Up," "Register," or "Create Account" button or link.
    *   You will be redirected to a Supabase-powered authentication page or a form integrated within the Suna UI.
    *   Fill in the required details (email, password, etc.) to create your account.

3.  **Email Confirmation (If Enabled):**
    *   Supabase, by default, may require email confirmation for new sign-ups. Check your email inbox (and spam folder) for a confirmation link from Supabase or Suna.
    *   Click the confirmation link to verify your email address and activate your account.
    *   *Note: Ensure your Supabase project has an email provider configured if email confirmation is enabled. If you have issues with email delivery, you might need to check your Supabase project's authentication settings and consider temporarily disabling email confirmation or configuring an SMTP provider in Supabase if you are using the self-hosted version of Supabase (not applicable if using Supabase cloud).*

4.  **First Login and Admin Privileges:**
    *   After successful sign-up (and email confirmation, if applicable), log in to the Suna platform with your new credentials.
    *   The documentation does not explicitly state if the first user automatically receives administrative privileges or if there's a separate step to grant them. Typically, in many systems, the first registered user might have elevated access, or specific configurations might apply.
    *   Explore the platform to familiarize yourself with its features and settings. If admin-specific sections are not visible, consult any further Suna documentation or community resources on how admin roles are assigned. For many Supabase-backed applications, user roles and permissions can be managed within the Supabase dashboard itself under the "Auth" -> "Users" section, potentially by assigning custom roles or using Row Level Security (RLS).

## Step 6: Verification and Troubleshooting

After completing the setup and initial user registration, verify that all components are functioning as expected.

1.  **Check Docker Container Status:**
    Ensure all Suna services are running:
    ```bash
    docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml ps
    ```
    All services (e.g., `backend`, `frontend`, `worker`, `redis`, `rabbitmq`) should show a status of `running` or `up`.

2.  **Review Logs for Errors:**
    If any service is not behaving as expected, check its logs:
    ```bash
    # For all services (use Ctrl+C to exit)
    docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml logs -f

    # For a specific service (e.g., backend)
    docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml logs -f backend
    ```
    Look for any error messages or stack traces that might indicate a problem.

3.  **Test Core Functionality:**
    *   Log in with the admin account created in Step 5.
    *   Try creating and running a simple agent.
    *   Test a feature that involves file access or web browsing if possible.
    *   Verify that agent interactions are being recorded and displayed.

4.  **Common Troubleshooting Steps:**

    *   **Port Conflicts:** If services fail to start, it might be due to port conflicts on your VPS. Ensure the ports defined in `docker-compose.yaml` (e.g., 3000, 8000) are not being used by other applications. You can modify the host port mapping in `docker-compose.yaml` if needed (see Step 3).
    *   **Incorrect Environment Variables:** Double-check all `.env` files (`backend/.env`, `frontend/.env.local`) for typos or incorrect values, especially URLs and API keys. Remember to restart the services after any changes:
        ```bash
        docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml down
        docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml up -d --build
        ```
    *   **API Key Issues:** Errors related to "authentication," "invalid key," or "quota exceeded" usually point to problems with your LLM, Supabase, Daytona, or other third-party API keys. Verify them in the respective service dashboards and update your `.env` files.
    *   **Supabase Connection:**
        *   Ensure the `basejump` schema is exposed as per Step 2.
        *   Verify your Supabase URL and keys are correct.
        *   Check if your Supabase project is paused or has any billing issues.
    *   **Daytona Agent Execution Issues:**
        *   Confirm the Daytona API key is correct.
        *   Ensure the `kortix/suna:0.1.2.8` image was created correctly in your Daytona account with the specified entrypoint, as detailed in Step 2.
    *   **Resource Limitations:** If services are crashing or unresponsive, your VPS might be running out of RAM or CPU. Monitor resource usage (`htop`, `docker stats`) and consider upgrading your VPS or adjusting the resource limits in `backend/docker-compose.prod.yml`.
    *   **Firewall Issues:** Ensure your VPS firewall (e.g., `ufw`) allows traffic on the ports used by Suna (e.g., 3000, 8000, and any other ports you've exposed). Example for `ufw`:
        ```bash
        sudo ufw allow 3000/tcp
        sudo ufw allow 8000/tcp
        sudo ufw reload
        ```
    *   **Refer to Existing Documentation:** The [Self-Hosting Guide](docs/SELF-HOSTING.md) contains a troubleshooting section that might offer additional insights.

5.  **Restarting Services:**
    To restart all Suna services after making configuration changes or for troubleshooting:
    ```bash
    docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml down
    docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml up -d 
    ```
    (Add `--build` if you need to rebuild images due to code or Dockerfile changes).

## Step 7: (Optional) Reverse Proxy and SSL/TLS

For a production deployment on a VPS, it is highly recommended to set up a reverse proxy (like Nginx or Traefik) and secure your Suna AI Platform instance with SSL/TLS certificates (e.g., from Let's Encrypt).

**Benefits of a Reverse Proxy:**

*   **SSL/TLS Termination:** Handle HTTPS traffic, encrypting data between users and your server.
*   **Custom Domain Names:** Easily map your domain (e.g., `suna.yourdomain.com`) to the Suna frontend and backend services.
*   **Load Balancing:** (Advanced) Distribute traffic if you scale to multiple instances.
*   **Improved Security:** Hide the specific ports of your application services.
*   **Serving Static Content:** Efficiently serve static assets for the frontend.

**How It Works:**

A reverse proxy sits in front of your Suna Docker containers. Public traffic hits the reverse proxy on standard ports (80 for HTTP, 443 for HTTPS). The reverse proxy then forwards this traffic to the appropriate Suna service (frontend on port 3000, backend on port 8000, or whatever you configured).

**Example Configuration (Conceptual for Nginx):**

If you have Nginx installed on your VPS, you would typically:

1.  **Install Nginx:** `sudo apt update && sudo apt install nginx`
2.  **Configure Server Blocks (Virtual Hosts):** Create configuration files in `/etc/nginx/sites-available/` for your Suna frontend and backend.
    *   One for `suna.yourdomain.com` (frontend) proxying to `http://localhost:3000`.
    *   Another for `api.suna.yourdomain.com` (or `suna.yourdomain.com/api`) (backend) proxying to `http://localhost:8000`.
3.  **Obtain SSL Certificates:** Use Certbot with Let's Encrypt to get free SSL certificates for your domain(s). Certbot can often automatically configure Nginx for SSL.
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d suna.yourdomain.com # Add more domains if needed
    ```
4.  **Update Suna Environment Variables:**
    *   If you set up SSL, change `NEXT_PUBLIC_URL` in `backend/.env` and `frontend/.env.local` to use `https` (e.g., `https://suna.yourdomain.com`).
    *   Update `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` accordingly (e.g., `https://api.suna.yourdomain.com/api` or `https://suna.yourdomain.com/api`).
    *   Restart Suna services: `docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml down && docker compose -f docker-compose.yaml -f backend/docker-compose.prod.yml up -d`

**Further Guidance:**

*   **Nginx:** Search for "Nginx reverse proxy Docker" or "Nginx Let's Encrypt Certbot". DigitalOcean and Linode have excellent tutorials.
*   **Traefik:** Traefik is another popular reverse proxy that integrates well with Docker. Search for "Traefik Docker reverse proxy".
*   **Caddy:** Caddy is known for its automatic HTTPS capabilities.

Setting up a reverse proxy and SSL is a crucial step for any production web application and significantly enhances security and usability. Since the specifics can vary based on your VPS setup and chosen tools, refer to dedicated guides for detailed instructions.

---

Congratulations! You should now have a fully deployed Suna AI Platform instance running on your VPS.
