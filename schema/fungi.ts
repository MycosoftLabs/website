import { pgTable, serial, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core"

export const fungi = pgTable("fungi", {
  id: serial("id").primaryKey(),
  commonName: varchar("common_name", { length: 255 }).notNull(),
  scientificName: varchar("scientific_name", { length: 255 }).notNull().unique(),
  description: text("description"),
  taxonomy: jsonb("taxonomy").notNull(),
  characteristics: jsonb("characteristics"),
  compounds: jsonb("compounds"),
  images: jsonb("images"),
  references: jsonb("references"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  dnaData: jsonb("dna_data").array(), // Add DNA data field
  gbifId: varchar("gbif_id", { length: 255 }), // Add GBIF ID field
  gbifUrl: text("gbif_url"), // Add GBIF URL field
  gbifDescription: text("gbif_description"), // Add GBIF Description field
  gbifImages: jsonb("gbif_images").array(), // Add GBIF Images field
})

export const compounds = pgTable("compounds", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  formula: varchar("formula", { length: 100 }).notNull(),
  molecularWeight: varchar("molecular_weight", { length: 50 }),
  description: text("description"),
  structure: jsonb("structure"),
  properties: jsonb("properties"),
  biologicalActivity: jsonb("biological_activity"),
  foundIn: jsonb("found_in"),
  safety: jsonb("safety"),
  references: jsonb("references"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export type Fungus = typeof fungi.$inferSelect
export type NewFungus = typeof fungi.$inferInsert
export type Compound = typeof compounds.$inferSelect
export type NewCompound = typeof compounds.$inferInsert
