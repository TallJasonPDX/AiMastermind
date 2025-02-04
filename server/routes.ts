import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { configurations, conversations } from "@db/schema";
import { eq } from "drizzle-orm";
import { processChat } from "../client/src/lib/openai";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const router = express.Router();
  app.use(router); // Mount the router

  // Configure FastAPI proxy with explicit middleware settings
  app.use(express.json()); // Ensure JSON body parsing is enabled

  const fastApiProxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      '^/api': '', // Remove /api prefix when forwarding to FastAPI
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq: any, req: any, _res: any) => {
      proxyReq.path = proxyReq.path.replace(/^\/api/, '');
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
      console.log('[FastAPI Proxy] Forwarding request:', {
        method: req.method,
        url: proxyReq.path,
        body: req.body
      });
    },
    onProxyRes: (proxyRes: any, req: any, _res: any) => {
      console.log('[FastAPI Proxy] Response:', {
        method: req.method,
        url: req.url,
        status: proxyRes.statusCode
      });
    },
    onError: (err: any, _req: any, res: any) => {
      console.error('[FastAPI Proxy] Error:', err);
      res.status(500).json({ error: 'Failed to connect to backend service' });
    }
  });

  // Apply proxy for FastAPI routes
  app.use('/api', (req, res, next) => {
    console.log('[FastAPI Route]', req.method, req.url, req.body);
    return fastApiProxy(req, res, next);
  });

  // Rest of the routes...
  router.post("/api/heygen/streaming/sessions", async (req, res) => {
    try {
      const apiKey = req.headers.authorization?.replace("Bearer ", "");
      console.log("\n[HeyGen Proxy] Request Details:");
      const heygenUrl = "https://api.heygen.com/v1/streaming.new";

      const headers = {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": apiKey,
      };

      console.log(
        "Headers:",
        JSON.stringify(
          {
            "x-api-key": apiKey ? "[PRESENT]" : "[MISSING]",
            "content-type": "application/json",
            accept: "application/json",
          },
          null,
          2,
        ),
      );

      console.log("URL:", heygenUrl);

      const requestBody = {
        quality: "medium",
        voice: { rate: 1 },
        video_encoding: "VP8",
        disable_idle_timeout: false,
      };

      console.log("Body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(heygenUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => response.statusText);
        console.error("\n[HeyGen Proxy] API Error:");
        console.error("Status:", response.status);
        console.error("Status Text:", response.statusText);
        console.error(
          "Response Headers:",
          JSON.stringify(
            Object.fromEntries(response.headers.entries()),
            null,
            2,
          ),
        );
        console.error("Response Body:", errorText);
        return res.status(response.status).json({
          error: `HeyGen API Error: ${response.status} ${response.statusText}`,
          details: errorText,
        });
      }

      const data = await response.json();
      console.log(
        "\n[HeyGen Proxy] Success Response:",
        JSON.stringify(data, null, 2),
      );
      res.json(data);
    } catch (error) {
      console.error("[HeyGen Proxy] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add endpoint to cleanup sessions
  router.delete(
    "/api/heygen/streaming/sessions/:sessionId",
    async (req, res) => {
      try {
        const apiKey = req.headers.authorization?.replace("Bearer ", "");
        const { sessionId } = req.params;

        const response = await fetch(
          `https://api.heygen.com/v1/streaming.close`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({ session_id: sessionId }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[HeyGen Proxy] Session cleanup failed:", errorText);
          return res
            .status(response.status)
            .json({ error: "Failed to cleanup session" });
        }

        res.json({ success: true });
      } catch (error) {
        console.error("[HeyGen Proxy] Session cleanup error:", error);
        res
          .status(500)
          .json({ error: "Internal server error during session cleanup" });
      }
    },
  );

  // Get all configurations
  router.get("/api/configs", async (_req, res) => {
    try {
      const configs = await db.query.configurations.findMany({
        orderBy: (configurations, { desc }) => [desc(configurations.createdAt)],
      });
      res.json(configs);
    } catch (error) {
      console.error("Error fetching configs:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });

  // Get active configuration
  app.get("/api/config/active", async (_req, res) => {
    try {
      const config = await db.query.configurations.findFirst({
        orderBy: (configurations, { asc }) => [asc(configurations.id)],
      });

      if (!config) {
        return res.status(404).json({ error: "No configurations found" });
      }

      res.json(config);
    } catch (error) {
      console.error("Active config error:", error);
      res.status(500).json({ error: "Failed to fetch active configuration" });
    }
  });

  // Get specific configuration
  app.get("/api/config/:id", async (req, res) => {
    console.log("[Config/:id] Request received with params:", req.params);
    const configId = parseInt(req.params.id);
    console.log(
      "[Config/:id] Parsed configId:",
      configId,
      "isNaN:",
      isNaN(configId),
    );
    if (isNaN(configId)) {
      console.log("[Config/:id] Invalid ID detected, returning 400");
      return res.status(400).json({ error: "Invalid Configuration ID" });
    }
    console.log("[Config/:id] Querying database for config:", configId);
    const config = await db.query.configurations.findFirst({
      where: eq(configurations.id, configId),
    });
    console.log("[Config/:id] Database result:", config);
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }
    res.json(config);
  });

  // Delete configuration
  app.delete("/api/config/:id", async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }

      console.log(`Attempting to delete config ${configId}`);

      // First delete associated conversations
      const deleteConversations = await db
        .delete(conversations)
        .where(eq(conversations.configId, configId))
        .returning();
      console.log(
        `Deleted ${deleteConversations.length} associated conversations`,
      );

      // Then delete the configuration
      const result = await db
        .delete(configurations)
        .where(eq(configurations.id, configId))
        .returning();

      if (result.length === 0) {
        console.log("No configuration found to delete");
        return res.status(404).json({ error: "Configuration not found" });
      }

      console.log("Successfully deleted configuration");
      res.json({ success: true });
    } catch (error) {
      console.error("Delete error:", error);
      res
        .status(500)
        .json({
          error: "Failed to delete configuration",
          details: error.message,
        });
    }
  });

  app.put("/api/config", async (req, res) => {
    const { id, ...updateData } = req.body;
    console.log("[Config PUT] Request body:", req.body);
    try {
      console.log("[Config PUT] Validating ID:", id, "isNaN:", isNaN(id));
      if (!id || isNaN(id)) {
        console.log("[Config PUT] Invalid ID detected, returning 400");
        return res.status(400).json({ error: "Invalid Configuration ID" });
      }

      // Remove updatedAt from updateData to prevent timestamp conflicts
      // Exclude timestamps from the update
      const { updatedAt, createdAt, ...cleanUpdateData } = updateData;

      const updated = await db
        .update(configurations)
        .set(cleanUpdateData)
        .where(eq(configurations.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  // Get chat history
  app.get("/api/chat", async (req, res) => {
    const { configId } = req.query;
    if (!configId) {
      return res.status(400).json({ error: "Configuration ID is required" });
    }

    // Create a new conversation
    const newConversation = await db
      .insert(conversations)
      .values({
        configId: Number(configId),
        messages: [], // Start with empty messages since we're using an assistant
        status: "ongoing",
      })
      .returning();

    res.json({
      messages: newConversation[0].messages,
      status: newConversation[0].status,
    });
  });

  // Send chat message
  app.post("/api/chat", async (req, res) => {
    const { configId, message } = req.body;

    try {
      // Get configuration first
      const config = await db.query.configurations.findFirst({
        where: eq(configurations.id, configId),
      });

      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      // Get or create conversation
      let conversation = await db.query.conversations.findFirst({
        where: eq(conversations.configId, configId),
        orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
      });

      const assistantId = (config.openaiAgentConfig as { assistantId: string })
        .assistantId;
      if (!assistantId) {
        return res
          .status(500)
          .json({
            error: "OpenAI Assistant ID not configured in this configuration",
          });
      }

      // Initialize messages array
      const messages: Array<{ role: "user" | "assistant"; content: string }> =
        (conversation?.messages as typeof messages) || [];

      // Add user message
      messages.push({
        role: "user",
        content: message || "Hey, what's up?",
      });

      const chatResponse = await processChat(messages, {
        pageTitle: config.pageTitle,
        openaiAgentConfig: {
          assistantId: assistantId,
          systemPrompt: (config.openaiAgentConfig as { systemPrompt: string })
            .systemPrompt,
        },
        passResponse: config.passResponse,
        failResponse: config.failResponse,
      });

      // Add assistant response
      messages.push({
        role: "assistant",
        content: chatResponse.response,
      });

      if (conversation) {
        await db
          .update(conversations)
          .set({
            messages,
            status: chatResponse.status,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conversation.id));
      } else {
        await db.insert(conversations).values({
          configId,
          messages,
          status: chatResponse.status,
        });
      }

      res.json({
        response: chatResponse.response,
        messages,
        status: chatResponse.status,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Register the router after the proxy middleware
  app.use(router);

  return httpServer;
}