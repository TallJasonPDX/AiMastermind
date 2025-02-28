#!/bin/bash

# Check environment - this script is for production only
if [ "$NODE_ENV" != "production" ]; then
  echo "⚠️ Warning: This script is intended for production use."
  echo "In development, use 'npm run dev' instead."
  
  # Check if we're in a Replit workflow or direct shell
  if [ -z "$REPL_ID" ]; then
    echo "Exiting. Use 'npm run dev' for development."
    exit 1
  else
    echo "Running in a Replit environment, continuing anyway..."
  fi
fi

# Check if the application is already running
if netstat -tuln | grep -q ":5000"; then
  echo "Warning: Port 5000 is already in use. Express server may already be running."
  echo "Checking if FastAPI is also running..."
  
  if curl -s http://localhost:8000/docs > /dev/null; then
    echo "✅ FastAPI server is already running on port 8000."
    echo "Both servers are already running. No need to start them again."
    exit 0
  else
    echo "❌ Express server is running but FastAPI server is not."
    echo "Will start only the FastAPI server..."
    
    # Start just the FastAPI server
    echo "Starting FastAPI server on port 8000..."
    exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
    exit $?
  fi
fi

# Start the FastAPI server in the background
echo "Starting FastAPI server on port 8000..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
FASTAPI_PID=$!

# Give FastAPI a moment to start up
echo "Waiting for FastAPI to initialize..."
sleep 3

# Verify FastAPI is running
if ! curl -s http://localhost:8000/docs > /dev/null; then
  echo "❌ ERROR: FastAPI server failed to start properly!"
  echo "Please check the logs above for errors."
  
  # Kill the FastAPI process if it's still running
  kill $FASTAPI_PID 2>/dev/null
  exit 1
fi

echo "✅ FastAPI server started successfully!"

# Start the Express server with production environment
echo "Starting Express server..."
NODE_ENV=production node dist/index.js

# If Express exits, kill the FastAPI server too
echo "Express server exited. Shutting down FastAPI server..."
kill $FASTAPI_PID 2>/dev/null