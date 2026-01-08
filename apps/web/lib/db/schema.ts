import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("messages_conversation_id_idx").on(table.conversationId)],
);

export const chartVersions = sqliteTable(
  "chart_versions",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageId: text("message_id").references(() => messages.id),
    mermaidCode: text("mermaid_code").notNull(),
    version: integer("version").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("chart_versions_conversation_id_idx").on(table.conversationId),
  ],
);

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
  chartVersions: many(chartVersions),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  chartVersions: many(chartVersions),
}));

export const chartVersionsRelations = relations(chartVersions, ({ one }) => ({
  conversation: one(conversations, {
    fields: [chartVersions.conversationId],
    references: [conversations.id],
  }),
  message: one(messages, {
    fields: [chartVersions.messageId],
    references: [messages.id],
  }),
}));
