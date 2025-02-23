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
    logLevel: "debug",
    onProxyReq: function onProxyReq(
      proxyReq: any,
      req: express.Request,
      res: ServerResponse,
    ) {
      try {
        if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader("Content-Type", "application/json");
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }

        // Log the outgoing request
        console.log("[FastAPI Proxy] Forwarding request:", {
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

  // Configure FastAPI proxy middleware
  app.use("/api", (req, res, next) => {
    console.log("[FastAPI Route]", req.method, req.url);
    // Don't modify the URL - let the proxy handle it
    return fastApiProxy(req, res, next);
  });

  // Register the router
  app.use(router);

  return httpServer;
}