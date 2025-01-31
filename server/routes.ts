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

  // Get active configuration
  app.get('/api/config/active', async (_req, res) => {
    try {
      console.log('[Config/active] Request received');
      console.log('[Config/active] Attempting database query');
      
      const config = await db.query.configurations.findFirst({
        orderBy: (configurations, { asc }) => [asc(configurations.id)]
      });

      console.log('[Config/active] Database query completed');
      console.log('[Config/active] Raw result:', JSON.stringify(config, null, 2));
      
      if (!config) {
        console.log('[Config/active] No configurations found in database');
        return res.status(404).json({ error: 'No configurations found' });
      }

      console.log('[Config/active] Valid config found:', {
        id: config.id,
        pageTitle: config.pageTitle
      });
      
      res.json(config);
    } catch (error) {
      console.error('Active config error:', error);
      res.status(500).json({ error: 'Failed to fetch active configuration' });
    }
  });

  // Get specific configuration
  app.get('/api/config/:id', async (req, res) => {
    console.log('[Config/:id] Request received with params:', req.params);
    const configId = parseInt(req.params.id);
    console.log('[Config/:id] Parsed configId:', configId, 'isNaN:', isNaN(configId));
    if (isNaN(configId)) {
      console.log('[Config/:id] Invalid ID detected, returning 400');
      return res.status(400).json({ error: 'Invalid Configuration ID' });
    }
    console.log('[Config/:id] Querying database for config:', configId);
    const config = await db.query.configurations.findFirst({
      where: eq(configurations.id, configId),
    });
    console.log('[Config/:id] Database result:', config);
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json(config);
  });
    try {
      console.log('[Config/active] Request received');
      console.log('[Config/active] Attempting database query');
      
      const config = await db.query.configurations.findFirst({
        orderBy: (configurations, { asc }) => [asc(configurations.id)]
      });

      console.log('[Config/active] Database query completed');
      console.log('[Config/active] Raw result:', JSON.stringify(config, null, 2));
      
      if (!config) {
        console.log('[Config/active] No configurations found in database');
        return res.status(404).json({ error: 'No configurations found' });
      }

      console.log('[Config/active] Valid config found:', {
        id: config.id,
        pageTitle: config.pageTitle
      });
      
      res.json(config);
    } catch (error) {
      console.error('Active config error:', error);
      res.status(500).json({ error: 'Failed to fetch active configuration' });
    }
  });

  // Delete configuration
  app.delete('/api/config/:id', async (req, res) => {
    try {
      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid configuration ID' });
      }

      console.log(`Attempting to delete config ${configId}`);
      
      // First delete associated conversations
      const deleteConversations = await db.delete(conversations)
        .where(eq(conversations.configId, configId))
        .returning();
      console.log(`Deleted ${deleteConversations.length} associated conversations`);
      
      // Then delete the configuration
      const result = await db.delete(configurations)
        .where(eq(configurations.id, configId))
        .returning();
        
      if (result.length === 0) {
        console.log('No configuration found to delete');
        return res.status(404).json({ error: 'Configuration not found' });
      }
      
      console.log('Successfully deleted configuration');
      res.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete configuration', details: error.message });
    }
  });

  app.put('/api/config', async (req, res) => {
    const { id, ...updateData } = req.body;
    console.log('[Config PUT] Request body:', req.body);
    try {
      console.log('[Config PUT] Validating ID:', id, 'isNaN:', isNaN(id));
      if (!id || isNaN(id)) {
        console.log('[Config PUT] Invalid ID detected, returning 400');
        return res.status(400).json({ error: 'Invalid Configuration ID' });
      }

      // Remove updatedAt from updateData to prevent timestamp conflicts
      // Exclude timestamps from the update
      const { updatedAt, createdAt, ...cleanUpdateData } = updateData;
      
      const updated = await db.update(configurations)
        .set(cleanUpdateData)
        .where(eq(configurations.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error('Update error:', error);
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

    try {
      // Get configuration first
      const config = await db.query.configurations.findFirst({
        where: eq(configurations.id, configId),
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      // Get or create conversation
      let conversation = await db.query.conversations.findFirst({
        where: eq(conversations.configId, configId),
        orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
      });

      const assistantId = (config.openaiAgentConfig as { assistantId: string }).assistantId;
      if (!assistantId) {
        return res.status(500).json({ error: 'OpenAI Assistant ID not configured in this configuration' });
      }

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
          assistantId: assistantId,
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