import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { configurations, conversations } from "@db/schema";
import { eq } from "drizzle-orm";
import { processChat } from "../client/src/lib/openai";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Get all configurations
  app.get('/api/configs', async (_req, res) => {
    const configs = await db.query.configurations.findMany({
      orderBy: (configurations, { desc }) => [desc(configurations.createdAt)],
    });
    res.json(configs);
  });

  // Get specific configuration
  app.get('/api/config/:id', async (req, res) => {
    const config = await db.query.configurations.findFirst({
      where: eq(configurations.id, parseInt(req.params.id)),
    });
    res.json(config);
  });

  // Get active configuration
  app.get('/api/config/active', async (_req, res) => {
    const config = await db.query.configurations.findFirst({
      orderBy: (configurations, { desc }) => [desc(configurations.createdAt)],
    });
    res.json(config);
  });

  // Delete configuration
  app.delete('/api/config/:id', async (req, res) => {
    try {
      await db.delete(configurations).where(eq(configurations.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete configuration' });
    }
  });

  app.put('/api/config', async (req, res) => {
    const { id, ...updateData } = req.body;
    try {
      const updated = await db.update(configurations)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(configurations.id, id))
        .returning();
      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  // Get chat history
  app.get('/api/chat', async (req, res) => {
    const { configId } = req.query;
    if (!configId) {
      return res.status(400).json({ error: 'Configuration ID is required' });
    }

    // Create a new conversation
    const newConversation = await db.insert(conversations).values({
      configId: Number(configId),
      messages: [], // Start with empty messages since we're using an assistant
      status: 'ongoing',
    }).returning();

    res.json({ 
      messages: newConversation[0].messages,
      status: newConversation[0].status
    });
  });

  // Send chat message
  app.post('/api/chat', async (req, res) => {
    const { configId, message } = req.body;

    if (!process.env.OPENAI_ASSISTANT_ID) {
      return res.status(500).json({ error: 'OpenAI Assistant ID not configured' });
    }

    try {
      // Get or create conversation
      let conversation = await db.query.conversations.findFirst({
        where: eq(conversations.configId, configId),
        orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
      });

      const config = await db.query.configurations.findFirst({
        where: eq(configurations.id, configId),
      });

      if (!config) {
        throw new Error('Configuration not found');
      }

      // Initialize messages array
      const messages: Array<{ role: 'user' | 'assistant', content: string }> = 
        conversation?.messages as typeof messages || [];

      // Add user message
      messages.push({ 
        role: 'user', 
        content: message || "Hey, what's up?" 
      });

      const chatResponse = await processChat(messages, {
        pageTitle: config.pageTitle,
        openaiAgentConfig: {
          assistantId: process.env.OPENAI_ASSISTANT_ID,
          systemPrompt: (config.openaiAgentConfig as { systemPrompt: string }).systemPrompt
        },
        passResponse: config.passResponse,
        failResponse: config.failResponse,
      });

      // Add assistant response
      messages.push({ 
        role: 'assistant', 
        content: chatResponse.response 
      });

      if (conversation) {
        await db.update(conversations)
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
        status: chatResponse.status
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  return httpServer;
}