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

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const router = express.Router();

  // Configure middleware
  app.use(express.json());

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
    const apiUrl = `http://localhost:8000${path}`;

    console.log(`[Proxy] ${req.method} request to ${apiUrl}`);

    try {
      // Prepare axios options
      const options: any = {
        method: req.method,
        url: apiUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        validateStatus: () => true, // Allow any status code
      };

      // Add body for non-GET requests
      if (req.method !== "GET" && req.body) {
        options.data = req.body;
        console.log("[Proxy] Request body:", JSON.stringify(req.body));
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
    } catch (error) {
      console.error("[Proxy] Error:", error);
      res.status(500).json({
        error: "Proxy Error",
        message: error.message,
      });
    }
  });

  // Register router
  app.use(router);

  return httpServer;
}
