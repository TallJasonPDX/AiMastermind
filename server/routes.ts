import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { configurations, conversations } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { processChat } from "../client/src/lib/openai";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { conversationFlows } from "@db/schema";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const router = express.Router();
  app.use(router); // Mount the router

  // Configure FastAPI proxy with explicit middleware settings
  app.use(express.json()); // Ensure JSON body parsing is enabled

  const fastApiProxy = createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      "^/api": "", // Remove /api prefix when forwarding to FastAPI
    },
    logLevel: "debug",
    onProxyReq: (proxyReq: any, req: any, _res: any) => {
      if (req.method === "POST" && req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
      console.log("[FastAPI Proxy] Forwarding request:", {
        method: req.method,
        url: req.url,
        body: req.body,
      });
    },
    onProxyRes: (proxyRes: any, req: any, _res: any) => {
      console.log("[FastAPI Proxy] Response:", {
        method: req.method,
        url: req.url,
        status: proxyRes.statusCode,
      });
    },
    onError: (err: any, _req: any, res: any) => {
      console.error("[FastAPI Proxy] Error:", err);
      res.status(500).json({ error: "Failed to connect to backend service" });
    },
  });

  // Apply proxy for FastAPI routes
  app.use("/api", (req, res, next) => {
    console.log("[FastAPI Route]", req.method, req.url, req.body);
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
  app.get("/api/configs", async (_req, res) => {
    try {
      console.log("[Configs] Fetching all configurations");
      // Forward the request to the FastAPI endpoint that returns all configurations.
      const response = await fetch("http://localhost:8000/configs");
      console.log("[Configs] FastAPI response status:", response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error("[Configs] FastAPI error:", error);
        return res.status(response.status).json({ error: "Failed to fetch configurations" });
      }

      const rawConfigs = await response.json();
      // Transform snake_case to camelCase for frontend consumption
      const configs = rawConfigs.map((config: any) => ({
        id: config.id,
        pageTitle: config.page_title,
        heygenSceneId: config.heygen_scene_id,
        voiceId: config.voice_id,
        openaiAgentConfig: config.openai_agent_config,
        passResponse: config.pass_response,
        failResponse: config.fail_response,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      }));

      console.log("[Configs] Transformed configs:", configs);
      res.json(configs);
    } catch (error) {
      console.error("[Configs] Error:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });

  // Get active configuration
  app.get("/api/config/active", async (_req, res) => {
    try {
      console.log("[Config/active] Fetching active configuration");
      const response = await fetch("http://localhost:8000/api/config/active");
      console.log("[Config/active] FastAPI response status:", response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error("[Config/active] FastAPI error:", error);
        return res.status(response.status).json({ error: "Failed to fetch active configuration" });
      }

      const config = await response.json();
      console.log("[Config/active] Received config:", config);
      res.json(config);
    } catch (error) {
      console.error("[Config/active] Error:", error);
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
      res.status(500).json({
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

  // POST handler for creating a new ConversationFlow
  router.post("/api/configs/:id/flows", async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      const {
        order,
        videoFilename,
        systemPrompt,
        agentQuestion,
        passNext,
        failNext,
        videoOnly,
        showForm,
        formName,
        inputDelay,
      } = req.body;
      // Validate required fields
      const requiredFields = {
        order,
        videoFilename,
        systemPrompt,
        agentQuestion,
      };
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }
      // Create the new ConversationFlow
      const newFlow = {
        configId,
        order,
        videoFilename,
        systemPrompt,
        agentQuestion,
        passNext: passNext ?? null,
        failNext: failNext ?? null,
        videoOnly: videoOnly ?? false,
        showForm: showForm ?? false,
        formName: formName ?? null,
        inputDelay: inputDelay ?? 0,
      };
      // Insert into the database, change it according to your actual insertion method
      await db.insert(conversationFlows).values(newFlow);
      // Respond with success
      res.status(201).json({
        message: "Conversation flow created successfully",
        flow: newFlow,
      });
    } catch (error) {
      console.error("[POST /api/configs/:id/flows] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete conversation flow
  router.delete("/api/configs/:id/flows/:flowId", async (req, res) => {
    const configId = parseInt(req.params.id);
    const flowId = parseInt(req.params.flowId);

    if (isNaN(configId) || isNaN(flowId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    try {
      const result = await db.delete(conversationFlows)
        .where(
          and(
            eq(conversationFlows.id, flowId),
            eq(conversationFlows.configId, configId)
          )
        )
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Flow not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete flow error:", error);
      res.status(500).json({ error: "Failed to delete flow" });
    }
  });

  // Add the PUT endpoint for updating flows
  router.put("/api/configs/:id/flows/:flowId", async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      const flowId = parseInt(req.params.flowId);

      if (isNaN(configId) || isNaN(flowId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      const response = await fetch(`http://localhost:8000/configs/${configId}/flows/${flowId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config_id: configId,
          ...req.body,
          // Convert camelCase to snake_case
          video_filename: req.body.videoFilename,
          system_prompt: req.body.systemPrompt,
          agent_question: req.body.agentQuestion,
          pass_next: req.body.passNext,
          fail_next: req.body.failNext,
          video_only: req.body.videoOnly,
          show_form: req.body.showForm,
          form_name: req.body.formName,
          input_delay: req.body.inputDelay,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[FastAPI] Error updating flow:`, error);
        return res.status(response.status).json({ error: "Failed to update flow" });
      }

      const updatedFlow = await response.json();
      res.json({
        id: updatedFlow.id,
        configId: updatedFlow.config_id,
        order: updatedFlow.order,
        videoFilename: updatedFlow.video_filename,
        systemPrompt: updatedFlow.system_prompt,
        agentQuestion: updatedFlow.agent_question,
        passNext: updatedFlow.pass_next,
        failNext: updatedFlow.fail_next,
        videoOnly: updatedFlow.video_only,
        showForm: updatedFlow.show_form,
        formName: updatedFlow.form_name,
        inputDelay: updatedFlow.input_delay,
        createdAt: updatedFlow.created_at,
        updatedAt: updatedFlow.updated_at
      });
    } catch (error) {
      console.error("[FastAPI] Error in PUT /api/configs/:id/flows/:flowId:", error);
      res.status(500).json({ error: "Failed to update conversation flow" });
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

  // Send chat message - REPLACED with edited snippet
  app.post("/api/chat", async (req, res) => {
    const { configId, message, currentFlowOrder } = req.body;
    if (!configId || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      console.log("[Chat] Forwarding chat request to FastAPI");
      // Get the current flow data from the request
      const flows = await fetch(`http://localhost:8000/configs/${configId}/flows`);
      if (!flows.ok) {
        throw new Error("Failed to fetch flows");
      }
      const flowsData = await flows.json();
      const currentFlow = flowsData.find((f: any) =>
        f.order === (currentFlowOrder || 1)
      );

      if (!currentFlow) {
        throw new Error("Current flow not found");
      }

      // Forward to FastAPI with all required data
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemPrompt: currentFlow.system_prompt,
          agentQuestion: currentFlow.agent_question,
          userMessage: message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[Chat] FastAPI error:", error);
        return res.status(response.status).json({ error: "Failed to process chat message" });
      }

      const data = await response.json();
      console.log("[Chat] FastAPI response:", data);

      // Determine next flow based on PASS/FAIL
      const nextFlowOrder = data.response.toUpperCase().includes("PASS")
        ? currentFlow.pass_next
        : currentFlow.fail_next;

      res.json({
        response: data.response,
        status: data.response.toUpperCase().includes("PASS") ? "pass" : "fail",
        nextFlowOrder
      });
    } catch (error) {
      console.error("[Chat] Error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });


  // Get conversation flows for a configuration
  router.get("/api/configs/:id/flows", async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }

      const response = await fetch(`http://localhost:8000/configs/${configId}/flows`);
      console.log(`[FastAPI] Flows response status for config ${configId}:`, response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error(`[FastAPI] Error fetching flows:`, error);
        return res.status(response.status).json({ error: "Failed to fetch flows" });
      }

      const rawFlows = await response.json();

      // Transform snake_case to camelCase
      const flows = rawFlows.map((flow: any) => ({
        id: flow.id,
        configId: flow.config_id,
        order: flow.order,
        videoFilename: flow.video_filename,
        systemPrompt: flow.system_prompt,
        agentQuestion: flow.agent_question,
        passNext: flow.pass_next,
        failNext: flow.fail_next,
        videoOnly: flow.video_only,
        showForm: flow.show_form,
        formName: flow.form_name,
        inputDelay: flow.input_delay,
        createdAt: flow.created_at,
        updatedAt: flow.updated_at
      }));

      console.log(`[FastAPI] Found ${flows.length} flows for config ${configId}`);
      res.json(flows);
    } catch (error) {
      console.error("[FastAPI] Error in /api/configs/:id/flows:", error);
      res.status(500).json({ error: "Failed to fetch conversation flows" });
    }
  });

  // Register the router after the proxy middleware
  app.use(router);

  return httpServer;
}