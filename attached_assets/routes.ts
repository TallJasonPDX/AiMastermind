// Server routes
/**
 * This file handles routing for the Express server. It sets up:
 * 1. The Express API endpoints
 * 2. Proxy to the FastAPI backend using http-proxy-middleware
 * 
 * The Express server handles API requests by proxying to the FastAPI backend.
 * Note that all frontend requests to /api/* are forwarded to FastAPI endpoints with the /api prefix removed.
 * For example: /api/configurations/active -> /configurations/active
 */
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { createProxyMiddleware, type Options } from "http-proxy-middleware";
import { IncomingMessage, ServerResponse } from "http";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const router = express.Router();

  // Configure middleware
  app.use(express.json());
  
  // Test endpoint in Express
  app.post('/express-test', (req: Request, res: Response) => {
    console.log('[Express] Test endpoint reached');
    console.log('[Express] Request body:', req.body);
    res.json({ success: true, message: 'Test successful', data: req.body });
  });

  // Create FastAPI proxy
  const fastApiProxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '' // Remove /api prefix when forwarding to FastAPI routes
    },
    // @ts-ignore - logLevel is valid but types don't include it
    logLevel: 'debug',
    onProxyReq: (proxyReq: any, req: IncomingMessage & { body?: any }, res: ServerResponse) => {
      console.log("[Proxy] Request URL:", req.url);
      console.log("[Proxy] Method:", req.method);
      
      // Handle POST requests
      if (req.method === 'POST' && req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
        console.log("[Proxy] Added request body:", req.body);
      }
    },
    onError: (err: Error, req: IncomingMessage, res: ServerResponse) => {
      console.error("[Proxy] Error:", err);
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      res.end('Proxy error: ' + err.message);
    }
  });

  // Mount proxy for all API routes
  // This means all requests to /api/* will be forwarded to the FastAPI backend
  // with the /api prefix removed by the pathRewrite rule above
  app.use('/api', fastApiProxy);
  
  // Register router
  app.use(router);
  
  return httpServer;
}