import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { createProxyMiddleware, type Options } from "http-proxy-middleware";
import type { IncomingMessage, ServerResponse } from "http";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const router = express.Router();

  // Configure FastAPI proxy with explicit middleware settings
  app.use(express.json()); // Ensure JSON body parsing is enabled

  // Create proxy middleware for FastAPI with detailed logging
  const fastApiProxy = createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    // Using proper types for the handlers
    onProxyReq: (proxyReq: any, req: express.Request, res: express.Response) => {
      console.log("[FastAPI Proxy] Forwarding request:", {
        method: req.method,
        path: req.path,
        body: req.body
      });

      // Ensure proper body forwarding for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes: any, req: express.Request, res: express.Response) => {
      console.log("[FastAPI Proxy] Received response:", {
        method: req.method,
        path: req.path,
        status: proxyRes.statusCode
      });
    },
    onError: (err: Error, req: express.Request, res: express.Response) => {
      console.error("[FastAPI Proxy] Error:", err);
      res.status(500).send("Proxy Error");
    }
  } as Options);

  // Apply proxy middleware for all /api routes 
  app.use("/api", (req, res, next) => {
    console.log("[FastAPI Route]", req.method, req.url);
    return fastApiProxy(req, res, next);
  });

  // Register the router
  app.use(router);

  return httpServer;
}