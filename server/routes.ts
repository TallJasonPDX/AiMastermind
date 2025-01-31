import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { configurations, conversations } from "@db/schema";
import { eq } from "drizzle-orm";
import { processChat } from "../client/src/lib/openai";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Get active configuration
  app.get('/api/config/active', async (_req, res) => {
    const config = await db.query.configurations.findFirst({
      orderBy: (configurations, { desc }) => [desc(configurations.createdAt)],
    });
    res.json(config);
  });

  // Get chat history
  app.get('/api/chat', async (req, res) => {
    const { configId } = req.query;
    if (!configId) {
      return res.status(400).json({ error: 'Configuration ID is required' });
    }

    // Always create a new conversation on initial load
    const config = await db.query.configurations.findFirst({
      where: eq(configurations.id, Number(configId)),
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Create a new conversation
    const newConversation = await db.insert(conversations).values({
      configId: Number(configId),
      messages: [{
        role: 'system',
        content: (config.openaiAgentConfig as { systemPrompt: string }).systemPrompt
      }],
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
      const messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }> = 
        conversation?.messages as typeof messages || [];

      // Add user message
      messages.push({ 
        role: 'user', 
        content: message || "Hey, what's up?" 
      });

      const chatResponse = await processChat(messages, {
        pageTitle: config.pageTitle,
        openaiAgentConfig: {
          assistantId: 'asst_J6fMLXA582DbB39yMkcF4sHG',
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