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
  app.use(express.urlencoded({ extended: true })); // Support URL-encoded bodies

  // Create proxy middleware for FastAPI with detailed logging
  const fastApiProxy = createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    secure: false,
    logLevel: "debug",
    pathRewrite: {
      '^/api': '/api',  // Ensure the API prefix is preserved
    },
    onProxyReq: function onProxyReq(
      proxyReq: any,
      req: express.Request,
      res: ServerResponse,
    ) {
      try {
        // For POST/PUT/PATCH requests, ensure body is properly written to the proxied request
        if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
          // Debug the request body to ensure it's correctly formatted
          console.log("[FastAPI Proxy] Request body:", req.body);
          
          // Clear existing body
          proxyReq.removeHeader('Content-Length');
          
          // Write the body as JSON
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader("Content-Type", "application/json");
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          
          console.log(`[FastAPI Proxy] Body written to proxy request: ${bodyData}`);
        }

        // Log the outgoing request details for debugging
        console.log("[FastAPI Proxy] Forwarding request:", {
          url: proxyReq.path,
          method: proxyReq.method,
          headers: proxyReq.getHeaders(),
          body: req.body ? JSON.stringify(req.body) : null,
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
      console.log("[FastAPI Proxy] Response received:", {
        method: request.method,
        path: request.path,
        status: proxyRes.statusCode,
      });
      
      // Collect the response body for debugging
      let responseBody = '';
      proxyRes.on('data', (chunk: Buffer) => {
        responseBody += chunk.toString('utf8');
      });
      
      proxyRes.on('end', () => {
        if (responseBody) {
          try {
            const jsonResponse = JSON.parse(responseBody);
            console.log("[FastAPI Proxy] Response body:", jsonResponse);
          } catch (e) {
            console.log("[FastAPI Proxy] Response body (raw):", responseBody);
          }
        }
      });
    },
    onError: function onError(
      err: Error,
      req: IncomingMessage,
      res: ServerResponse,
    ) {
      console.error("[FastAPI Proxy] Proxy error:", err);
      console.error("[FastAPI Proxy] Error details:", {
        message: err.message,
        stack: err.stack,
        url: (req as express.Request).url,
        method: (req as express.Request).method,
      });
      res.statusCode = 500;
      res.end(`Proxy Error: ${err.message}`);
    },
  } as Options);

  // Define middleware to handle API routes
  app.use("/api", (req, res, next) => {
    // Log complete request details before proxying
    console.log("[FastAPI Route]", req.method, req.url, {
      body: req.body,
      headers: req.headers,
    });
    
    return fastApiProxy(req, res, next);
  });

  // Register the router
  app.use(router);

  return httpServer;
}