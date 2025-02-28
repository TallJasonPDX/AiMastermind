// Server routes
/**
 * This file handles routing for the Express server. It sets up:
 * 1. The Express API endpoints
 * 2. Proxy to the FastAPI backend using http-proxy-middleware
 * 3. Axios is now imported to manage HTTP requests
 * The Express server handles API requests by proxying to the FastAPI backend.
 * Note that all frontend requests to /api/* are forwarded to FastAPI endpoints with the /api prefix removed.
 * For example: /api/configurations/active -> /configurations/active
 */
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import express from "express";
import axios from "axios";
import path from "path";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const router = express.Router();

  // Configure middleware
  app.use(express.json());

  // Determine FastAPI URL based on environment
  const fastApiHost = (() => {
    // In production environment
    if (process.env.NODE_ENV === "production") {
      // If FastAPI is running as part of the same application (common deployment pattern)
      const internalFastApiUrl = "http://localhost:8000";
      
      // If a custom FASTAPI_URL is provided in environment variables, use that instead
      const configuredUrl = process.env.FASTAPI_URL || internalFastApiUrl;
      
      console.log(`[Server] Production environment detected, using FastAPI URL: ${configuredUrl}`);
      
      // Warn if using localhost in a potentially externally accessible URL
      if (configuredUrl.includes("localhost")) {
        console.warn("[Server] WARNING: Using localhost in FASTAPI_URL - this will only work if FastAPI is running in the same container");
      }
      
      return configuredUrl;
    }
    
    // In development environment - always use localhost:8000
    return "http://localhost:8000";
  })();

  console.log(`[Server] Using FastAPI backend at ${fastApiHost}`);

  // Mount videos directory for static file serving
  const videosPath = path.join(process.cwd(), "videos");
  app.use("/videos", express.static(videosPath));
  console.log(`[Server] Serving videos from ${videosPath}`);

  // Test endpoint in Express
  app.post("/express-test", (req: Request, res: Response) => {
    console.log("[Express] Test endpoint reached");
    console.log("[Express] Request body:", req.body);
    res.json({ success: true, message: "Test successful", data: req.body });
  });

  // Handle all /api/* requests
  app.all("/api/*", async (req: Request, res: Response) => {
    // Remove /api prefix from path
    const path = req.url.replace(/^\/api/, "");
    const apiUrl = `${fastApiHost}${path}`;

    console.log(`[Proxy] ${req.method} request to ${apiUrl}`);

    try {
      // Log the complete URL we're trying to connect to
      console.log(`[Proxy] Full request details:`, {
        method: req.method,
        url: apiUrl,
        headers: req.headers,
      });
      
      // Prepare axios options
      const options: any = {
        method: req.method,
        url: apiUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        validateStatus: () => true, // Allow any status code
        timeout: 5000, // 5 second timeout to fail fast
      };

      // Add body for non-GET requests
      if (req.method !== "GET" && req.body) {
        options.data = req.body;
        console.log("[Proxy] Request body:", JSON.stringify(req.body));
      }

      // Try to ping FastAPI server first
      try {
        const pingResponse = await axios.get(`${fastApiHost}/docs`, { timeout: 1000 });
        console.log(`[Proxy] FastAPI server health check: HTTP ${pingResponse.status}`);
      } catch (pingError: any) {
        console.error(`[Proxy] FastAPI server health check failed: ${pingError.message}`);
        console.error(`[Proxy] This suggests the FastAPI server is not running at ${fastApiHost}`);
      }

      // Make request to API
      const apiResponse = await axios(options);

      // Forward appropriate status code
      res.status(apiResponse.status);

      // Forward response headers
      Object.entries(apiResponse.headers).forEach(([name, value]) => {
        res.setHeader(name, value);
      });

      // Handle response
      if (apiResponse.data) {
        console.log("[Proxy] Response data:", apiResponse.data);
        res.send(apiResponse.data);
      } else {
        console.log("[Proxy] Empty response");
        res.end();
      }
    } catch (error: any) {
      console.error("[Proxy] Error:", error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error("[Proxy] Connection refused - FastAPI server is not running!");
        console.error("[Proxy] Make sure FastAPI server is running on port 8000");
        
        // Check if we're in production
        if (process.env.NODE_ENV === 'production') {
          console.error(`[Proxy] CRITICAL: In production, both Express AND FastAPI must be running!`);
          console.error(`[Proxy] Your start script needs to launch both servers, not just Express`);
        }
      }
      
      res.status(500).json({
        error: "Proxy Error",
        message: error.message || "Unknown error occurred",
        code: error.code,
        suggestion: error.code === 'ECONNREFUSED' 
          ? "The FastAPI server is not running. Please make sure it's started."
          : "Check server logs for more details."
      });
    }
  });

  // Register router
  app.use(router);

  return httpServer;
}
