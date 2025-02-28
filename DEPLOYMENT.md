# Deployment Guide

This guide covers how to deploy the application in various environments.

## IMPORTANT: Starting Both Servers

The application consists of TWO servers that BOTH need to be running:

1. Express server (Node.js) - Serves the frontend and proxies API requests
2. FastAPI server (Python) - Handles backend API requests

**CRITICAL**: In production, you must start BOTH servers for the application to work!

## Starting the Application

To properly start the application in production, use the provided startup script:

```bash
# Use the start.sh script that launches both servers
./start.sh
```

This script is already created and will:
1. Start the FastAPI server in the background
2. Wait for it to initialize
3. Start the Express server

### IMPORTANT: Update Replit Run Command

Update your Replit run command to use this script instead of just `npm run start`:

1. Go to your Replit's "Settings" tab
2. Scroll down to "Run" section
3. Change the Run command to: `./start.sh`
4. Click "Save Changes"

This is crucial for your deployment to work properly.

## Environment Variables

The application requires the following environment variables:

| Variable | Description | Local Dev Value | Production Value |
|----------|-------------|-----------------|------------------|
| NODE_ENV | Environment type | `development` | `production` |
| FASTAPI_URL | URL of the FastAPI backend | `http://localhost:8000` | `http://localhost:8000` (for single container) |
| DATABASE_URL | PostgreSQL database connection string | `postgresql://...` | `postgresql://...` (same as local) |

## Deployment Types

### 1. Single Replit Container (Recommended for https://aimastermind.replit.app)

For deploying both the Express server and FastAPI backend in a single Replit container:

```
FASTAPI_URL: http://localhost:8000
NODE_ENV: production
```

This configuration will:
- Run both Express and FastAPI in the same container
- Express will proxy requests to the locally running FastAPI instance
- Frontend will use relative `/api` path automatically

### 2. Separate Frontend and Backend

If you're deploying the Express frontend and FastAPI backend in separate Replit apps:

```
# On the frontend Replit
FASTAPI_URL: https://your-fastapi-backend.replit.app
NODE_ENV: production
```

Replace `https://your-fastapi-backend.replit.app` with the actual URL of your deployed FastAPI backend.

## Troubleshooting

### API Connection Issues

If your frontend can't connect to the API after deployment, check the following:

1. Verify both servers are running:
   - Express should be serving on port 5000
   - FastAPI should be serving on port 8000

2. Check the logs for connection errors:
   - Look for `[Proxy] Error` messages in the Express logs
   - These will indicate if there are issues connecting to the FastAPI backend

3. Test direct connection:
   - Try connecting directly to your FastAPI endpoint
   - For single container: `curl http://localhost:8000/configurations/active`
   - For multi-container: `curl https://your-fastapi-backend.replit.app/configurations/active`

4. For multi-container deployments:
   - Ensure CORS is properly configured on the FastAPI backend
   - Verify that the FastAPI backend is publicly accessible

### Common Errors

1. **"ECONNREFUSED 127.0.0.1:8000"**
   - This means Express can't connect to FastAPI on localhost
   - Make sure FastAPI is running on port 8000
   - For multi-container deployments, ensure FASTAPI_URL is set to the correct remote URL

2. **"Proxy Error"**
   - This is a generic error when the proxy fails
   - Check the server logs for more detailed information

## Verification Test

Run the API test script to verify your configuration:

```bash
npx tsx server/api-test.ts
```

This will test both direct connections and proxy connections to ensure everything is working properly.