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
  
  // Add Express-only endpoints for testing (won't be proxied to FastAPI)
  app.post('/api-express/test', (req, res) => {
    console.log('[Express Test] Received test POST request');
    console.log('[Express Test] Request body:', req.body);
    res.json({ success: true, message: 'Test endpoint reached in Express', body: req.body });
  });

  // Simple proxy setup - direct pass-through to FastAPI with minimal configuration
  const fastApiProxy = createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    secure: false,
    logLevel: "debug",
    onProxyReq: function onProxyReq(
      proxyReq: any,
      req: express.Request,
      res: ServerResponse,
    ) {
      try {
        console.log("[FastAPI Proxy] BEFORE PROXY REQUEST - Original URL:", req.url);
        console.log("[FastAPI Proxy] BEFORE PROXY REQUEST - Method:", req.method);
        console.log("[FastAPI Proxy] BEFORE PROXY REQUEST - Target URL:", proxyReq.path);
        
        if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader("Content-Type", "application/json");
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          console.log("[FastAPI Proxy] Added request body for POST/PUT/PATCH");
        }

        // Log the outgoing request
        console.log("[FastAPI Proxy] Forwarding request to FastAPI:", {
          url: proxyReq.path,
          method: proxyReq.method,
          headers: proxyReq.getHeaders(),
          body: req.body,
        });
      } catch (error) {
        console.error("[FastAPI Proxy] Error in request handling:", error);
      }
    },
    onProxyRes: function onProxyRes(
      proxyRes: any,
      req: IncomingMessage,
      res: ServerResponse,
    ) {
      const request = req as express.Request;
      console.log("[FastAPI Proxy] Response:", {
        method: request.method,
        path: request.path,
        status: proxyRes.statusCode,
      });
    },
    onError: function onError(
      err: Error,
      req: IncomingMessage,
      res: ServerResponse,
    ) {
      console.error("[FastAPI Proxy] Error:", err);
      res.statusCode = 500;
      res.end("Proxy Error");
    },
  } as Options);

  // Standalone endpoint test directly in Express server
  app.post('/api/express-test', (req, res) => {
    console.log('[Express Test Direct] Received test POST request');
    console.log('[Express Test Direct] Request body:', req.body);
    res.json({ success: true, message: 'Express direct test endpoint reached', body: req.body });
  });
  
  // Setup a single clean proxy for all FastAPI routes
  app.use('/api', fastApiProxy);

  // Register the router
  app.use(router);

  return httpServer;
}