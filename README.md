
## Backend Setup (FastAPI)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install Python dependencies:**
    Ensure you have Python 3.11 or higher and `pip` installed. It's recommended to use a virtual environment.
    ```bash
    pip install -r ../uv.lock
    ```
    Alternatively, if you don't have `uv.lock`, you can use `pip install -r ../pyproject.toml` but this might resolve to different versions.

3.  **Database Configuration:**
    *   Ensure you have PostgreSQL installed and running.
    *   Set the `DATABASE_URL` environment variable. This URL should point to your PostgreSQL database. Example format: `postgresql://user:password@host:port/database_name`. You can create a `.env` file in the `backend/` directory and add:
        ```
        DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_database_name
        OPENAI_API_KEY=your_openai_api_key
        HEYGEN_API_KEY=your_heygen_api_key
        ```
    *   Make sure the database specified in `DATABASE_URL` exists.

4.  **Run Migrations:**
    The database schema is managed using Drizzle ORM. Migrations are located in `db/migrations/`.
    While Drizzle migrations are configured for the frontend, the backend uses SQLAlchemy. Ensure your database schema is in sync with `backend/models.py`. You might need to use SQLAlchemy migrations (Alembic) if schema changes are needed, though this project seems to manage schema directly through SQLAlchemy's ORM.

5.  **Run the FastAPI application:**
    ```bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
    *   `main:app` specifies the FastAPI application instance in `backend/main.py`.
    *   `--reload` enables hot-reloading for development.
    *   `--host 0.0.0.0` makes the server accessible from outside the container (if running in one).
    *   `--port 8000` specifies the port the FastAPI server will run on.

## Frontend Setup (React)

1.  **Navigate to the client directory:**
    ```bash
    cd client
    ```

2.  **Install npm dependencies:**
    Ensure you have Node.js and npm installed.
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    The frontend configuration is in `client/src/config.ts`.  By default, it points to `http://localhost:8000` for local development and a placeholder URL for Replit deployment. No `.env` file is needed for the frontend in this setup, configuration is done directly in `config.ts`.

4.  **Run the React application in development mode:**
    From the project root directory:
    ```bash
    npm run dev
    ```
    This command starts both the Express server (which proxies to Vite in development) and the Vite development server for the React frontend. The frontend application should be accessible at `http://localhost:5000`.

5.  **Build the React application for production:**
    ```bash
    npm run build
    ```
    This command builds the frontend application and places the static assets in the `dist/public` directory, ready to be served by a static file server or the Express server in production.

## Database Setup

This project uses PostgreSQL. You need to:

1.  **Install PostgreSQL:** Follow the instructions for your operating system to install PostgreSQL.
2.  **Create a Database:** Create a PostgreSQL database that you will use for this project.
3.  **Configure `DATABASE_URL`:** Set the `DATABASE_URL` environment variable to connect to your newly created database (as described in Backend Setup).
4.  **Run Migrations (if necessary):** While the project includes Drizzle schema (`db/schema.ts`) and migrations (`db/migrations/`), the backend uses SQLAlchemy. Ensure the database schema is created according to `backend/models.py`. You might need to execute SQL directly or use SQLAlchemy's migration tools if the schema is not automatically created by SQLAlchemy on first run.

## Environment Variables

**Required Environment Variables:**

*   **`DATABASE_URL`**:  Connection string to your PostgreSQL database. (Backend)
*   **`OPENAI_API_KEY`**: API key for OpenAI. (Backend)
*   **`HEYGEN_API_KEY`**: API key for HeyGen Streaming API. (Backend)

**Optional Environment Variables:**

*   `NODE_ENV`: Set to `production` for production environment (e.g., `NODE_ENV=production node dist/index.js`).

## Deployment

The `.replit` and `[deployment]` section in `.replit` file suggest that this project is configured for deployment on Replit Cloud Run.

**Deployment steps on Replit (Cloud Run):**

1.  **Build:** Replit automatically uses `npm run build` as the build command, which is defined in `package.json` to build both client and server.
2.  **Run:** Replit uses `npm run start` as the run command, which starts the production Express server serving the built frontend and proxying API requests to the FastAPI backend.
3.  **Ports:** Ports `5000` and `8000` are exposed. Port `5000` is for the Express server (frontend access), and `8000` is for the FastAPI backend (internal proxy).

For other deployment environments (like AWS, GCP, Azure, or self-hosting):

1.  **Build the Frontend:** `npm run build` in the `client/` directory.
2.  **Build the Backend (if needed):** For Python FastAPI, typically no specific build step is required other than installing dependencies.
3.  **Deploy Backend:** Deploy the FastAPI application (using Uvicorn or similar ASGI server). Ensure environment variables are set (`DATABASE_URL`, `OPENAI_API_KEY`, `HEYGEN_API_KEY`).
4.  **Deploy Frontend:** Serve the static files from `client/dist/public` using a web server (like Nginx, Apache, or Express `serve-static` middleware).
5.  **Configure Proxy:** If you are using a separate frontend and backend server, configure a proxy from your frontend domain `/api` path to your backend server URL (e.g., using Nginx proxy pass, or similar).

## Running the Application

**For local development:**

1.  Ensure PostgreSQL database is running and `DATABASE_URL` is correctly configured.
2.  Ensure `OPENAI_API_KEY` and `HEYGEN_API_KEY` are set in your environment or `.env` file in `backend/`.
3.  Open two terminal windows.
4.  In one terminal, navigate to the project root and run: `npm run dev`. This starts both frontend and backend in development mode.
5.  Open your browser and go to `http://localhost:5000`.

**For production (after building):**

1.  Ensure PostgreSQL database is running and `DATABASE_URL`, `OPENAI_API_KEY`, `HEYGEN_API_KEY` are correctly configured in the production environment.
2.  Navigate to the project root directory.
3.  Run: `npm run start`. This starts the Express server in production mode, serving the built frontend and backend API proxy.
4.  Open your browser and go to the deployed URL (e.g., Replit deployment URL or your server's domain/IP).

## Key Features

*   **Interactive AI Landing Pages:** Create landing pages with engaging, conversational AI avatars.
*   **HeyGen Avatar Streaming:** Integrates with HeyGen API for realistic avatar streaming.
*   **OpenAI Agent Integration:** Uses OpenAI Assistants for intelligent conversation management and response generation.
*   **Configurable Conversation Flows:** Define and customize conversation steps, video prompts, and AI agent interactions through a structured flow system.
*   **Real-time Video Streaming with LiveKit:** Leverages LiveKit for robust and scalable real-time video delivery to the frontend.
*   **Dynamic Content:**  Supports video playback, chat interfaces, and potentially dynamic forms within the conversation flow.
*   **Admin Interface (Basic):** Provides basic API endpoints for configuration and flow management (though a dedicated admin UI is not explicitly present in the codebase, management is done via direct API calls).

## Contributing

Contributions are welcome! Please follow these general guidelines:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix.
3.  **Make your changes** and ensure they are well-tested.
4.  **Submit a pull request** with a clear description of your changes.

For significant changes or new features, it's recommended to discuss them in an issue first before starting development.