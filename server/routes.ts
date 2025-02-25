// Server routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const router = express.Router();

  // Configure middleware
  app.use(express.json());
  
  // Test endpoint in Express
  app.post('/express-test', (req, res) => {
    console.log('[Express] Test endpoint reached');
    console.log('[Express] Request body:', req.body);
    res.json({ success: true, message: 'Test successful', data: req.body });
  });

  // Create FastAPI proxy
  const fastApiProxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/api' // Keep the /api prefix
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
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
    onError: (err, req, res) => {
      console.error("[Proxy] Error:", err);
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      res.end('Proxy error: ' + err.message);
    }
  });

  // Mount proxy for all API routes
  app.use('/api', fastApiProxy);
  
  // Register router
  app.use(router);
  
  return httpServer;
}