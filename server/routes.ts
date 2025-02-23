import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

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
    pathRewrite: undefined, // Changed to undefined to reflect default behavior
    onProxyReq: (proxyReq, req, res) => { // Renamed _res to res for consistency
      console.log("[FastAPI Proxy] Forwarding request:", {
        method: req.method,
        path: req.path,
        body: req.body
      });

      // Ensure proper body forwarding for POST requests
      if (req.method === "POST" && req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, _res) => {
      console.log("[FastAPI Proxy] Received response:", {
        method: req.method,
        path: req.path,
        status: proxyRes.statusCode
      });
    },
    onError: (err, req, res) => {
      console.error("[FastAPI Proxy] Error:", err);
      res.status(500).send("Proxy Error");
    }
  });

  // Apply proxy for all /api routes
  app.use("/api", (req, res, next) => {
    console.log("[FastAPI Route]", req.method, req.url);
    return fastApiProxy(req, res, next);
  });

  // Register the router
  app.use(router);

  return httpServer;
}