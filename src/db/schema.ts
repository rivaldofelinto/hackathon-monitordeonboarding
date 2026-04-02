import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  varchar,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * PROPERTIES — Imóveis/Propriedades (500+ items)
 * Cada imóvel tem um codigo_imovel único (FK para validação Pipefy)
 */
export const properties = pgTable("properties", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  codigo_imovel: varchar("codigo_imovel", { length: 50 }).notNull().unique(),
  endereco: text("endereco").notNull(),
  cidade: varchar("cidade", { length: 100 }).notNull(),
  uf: varchar("uf", { length: 2 }).notNull(),
  responsavel: varchar("responsavel", { length: 100 }),
  status: varchar("status", { length: 20 }).default("ativo"), // ativo, inativo, pausado
  metadata: jsonb("metadata"), // dados extras do Pipefy
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * STAGES — Etapas de Onboarding (23 fases)
 * Cada propriedade passa por múltiplas stages
 */
export const stages = pgTable("stages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  property_id: integer("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  stage_number: integer("stage_number").notNull(), // 1-23
  stage_name: varchar("stage_name", { length: 100 }).notNull(), // "Documentação", "Aprovação", etc
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, blocked
  sla_color: varchar("sla_color", { length: 20 }).default("green"), // green, yellow, red
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  blocked_reason: text("blocked_reason"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * ACTIVITIES — Timeline de Eventos/Atividades
 * Cada stage pode ter múltiplas atividades (comentários, uploads, transições)
 */
export const activities = pgTable("activities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  stage_id: integer("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  property_id: integer("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  activity_type: varchar("activity_type", { length: 50 }).notNull(), // comment, transition, upload, assignment
  actor: varchar("actor", { length: 100 }), // quem fez a atividade
  description: text("description"),
  metadata: jsonb("metadata"), // dados extras do Pipefy (attachment URLs, etc)
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/**
 * SYNC_LOG — Log de Sincronizações com Nekt/Pipefy
 * Rastreia quando foi feito o último sync (05h/12h)
 */
export const sync_log = pgTable("sync_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sync_type: varchar("sync_type", { length: 50 }).notNull(), // "nekt", "pipefy", "full"
  started_at: timestamp("started_at").notNull(),
  completed_at: timestamp("completed_at"),
  status: varchar("status", { length: 20 }).notNull(), // pending, running, success, failed
  items_processed: integer("items_processed").default(0),
  items_failed: integer("items_failed").default(0),
  error_message: text("error_message"),
  metadata: jsonb("metadata"), // retry count, next sync time, etc
});

/**
 * Relations
 */
export const propertiesRelations = relations(properties, ({ many }) => ({
  stages: many(stages),
  activities: many(activities),
  syncLogs: many(sync_log),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  property: one(properties, {
    fields: [stages.property_id],
    references: [properties.id],
  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  property: one(properties, {
    fields: [activities.property_id],
    references: [properties.id],
  }),
  stage: one(stages, {
    fields: [activities.stage_id],
    references: [stages.id],
  }),
}));
