import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  pageTitle: text("page_title").notNull(),
  heygenSceneId: text("heygen_scene_id").notNull(),
  openaiAgentConfig: jsonb("openai_agent_config").notNull(),
  passResponse: text("pass_response").notNull(),
  failResponse: text("fail_response").notNull(),
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
}));

export const conversationRelations = relations(conversations, ({ one }) => ({
  configuration: one(configurations, {
    fields: [conversations.configId],
    references: [configurations.id],
  }),
}));

export const insertConfigSchema = createInsertSchema(configurations);
export const selectConfigSchema = createSelectSchema(configurations);
export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);
