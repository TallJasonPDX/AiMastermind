import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  pageTitle: text("page_title").notNull(),
  heygenSceneId: text("heygen_scene_id").notNull(),
  voiceId: text("voice_id").notNull().default('9d7ba6d68d2940579a07c4a0d934f914'),
  openaiAgentConfig: jsonb("openai_agent_config").$type<{
    assistantId: string;
  }>().notNull(),
  passResponse: text("pass_response").notNull(),
  failResponse: text("fail_response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationFlows = pgTable("conversation_flows", {
  id: serial("id").primaryKey(),
  configId: integer("config_id").references(() => configurations.id).notNull(),
  order: integer("order").notNull(),
  videoFilename: text("video_filename").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  agentQuestion: text("agent_question").notNull(),
  passNext: integer("pass_next"),
  failNext: integer("fail_next"),
  videoOnly: boolean("video_only").notNull().default(false),
  showForm: boolean("show_form").notNull().default(false),
  formName: text("form_name"),
  inputDelay: integer("input_delay").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  configId: serial("config_id").references(() => configurations.id),
  messages: jsonb("messages").$type<Array<{role: string, content: string}>>().notNull(),
  status: text("status").notNull().default('ongoing'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const configRelations = relations(configurations, ({ many }) => ({
  conversations: many(conversations),
  conversationFlows: many(conversationFlows),
}));

export const conversationRelations = relations(conversations, ({ one }) => ({
  configuration: one(configurations, {
    fields: [conversations.configId],
    references: [configurations.id],
  }),
}));

export const conversationFlowRelations = relations(conversationFlows, ({ one }) => ({
  configuration: one(configurations, {
    fields: [conversationFlows.configId],
    references: [configurations.id],
  }),
}));

// Create Zod schemas for type-safe inserts and selects
export const insertConfigSchema = createInsertSchema(configurations);
export const selectConfigSchema = createSelectSchema(configurations);
export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);
export const insertConversationFlowSchema = createInsertSchema(conversationFlows);
export const selectConversationFlowSchema = createSelectSchema(conversationFlows);