import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn } from "child_process";
import path from "path";

// Enable verbose logging
const DEBUG = true;
const debugLog = (...args: any[]) => {
  if (DEBUG) console.log("[DEBUG]", ...args);
};

// Start FastAPI server (only in development mode)
const startFastAPI = () => {
  // Skip starting FastAPI if we're in production
  if (process.env.NODE_ENV === "production") {
    console.log(
      "[Server] Running in production mode - skipping local FastAPI server",
    );
    return;
  }

  console.log("[Server] Starting development FastAPI server...");
  const fastApiProcess = spawn("python3", [
    "-m",
    "uvicorn",
    "backend.main:app",
    "--host",
    "0.0.0.0",
    "--port",
    "8000",
  ]);

  fastApiProcess.stdout.on("data", (data) => {
    console.log("[FastAPI]", data.toString());
  });

  fastApiProcess.stderr.on("data", (data) => {
    console.error("[FastAPI Error]", data.toString());
  });

  fastApiProcess.on("close", (code) => {
    console.log("[FastAPI] Process exited with code", code);
  });

  // Handle process termination
  process.on("SIGTERM", () => {
    fastApiProcess.kill();
    process.exit(0);
  });
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add middleware to log requests
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Start FastAPI server first (only in development)
  startFastAPI();

  // In production, FastAPI should be running separately
  if (process.env.NODE_ENV !== "production") {
    // Wait a bit for FastAPI to initialize in development
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const server = registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite or serve static content based on environment
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Determine port - use PORT env var with fallback to 5000
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Express server serving on port ${PORT}`);
  });
})();
