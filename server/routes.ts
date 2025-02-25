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
  
  // Add a test POST endpoint directly in Express for debugging
  app.post('/api/test-post', (req, res) => {
    console.log('[Express Test] Received test POST request');
    console.log('[Express Test] Request body:', req.body);
    res.json({ success: true, message: 'Test POST endpoint reached', body: req.body });
  });

  // Create proxy middleware for FastAPI with detailed logging
  const fastApiProxy = createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    secure: false,
    logLevel: "debug",
    pathRewrite: {
      // Make sure we're not stripping the /api prefix
      '^/api': '/api' // Keep the /api prefix
    },
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
  
  app.use("/api", (req, res, next) => {
    console.log("[FastAPI Router] Original URL:", req.url);
    console.log("[FastAPI Router] HTTP Method:", req.method);
    
    if (req.method === 'POST') {
      console.log("[FastAPI Router] POST Request Body:", req.body);
    }
    
    // Strip the initial /api prefix before forwarding to proxy (which adds its own)
    // This avoids double /api/api prefixes
    if (req.url.startsWith("/api/")) {
      console.log("[FastAPI Router] Stripping initial /api from URL to avoid double prefix");
      req.url = req.url.substring(4); // Remove "/api" from the beginning
    }
    
    console.log("[FastAPI Router] Final URL being sent to proxy:", req.url);
    return fastApiProxy(req, res, next);
  });

  // Register the router
  app.use(router);

  return httpServer;
}