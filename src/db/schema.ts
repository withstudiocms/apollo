import { sqliteTable, text, int } from "drizzle-orm/sqlite-core";

export const guildsTable = sqliteTable("guilds", {
  id: text().primaryKey().unique().notNull(),
  forum_channel: text(),
  ptal_announcement_role: text(),
});

export const ptalTable = sqliteTable("ptals", {
  id: int().primaryKey({ autoIncrement: true }),
  channel: text().notNull(),
  message: text().notNull().unique(),
  repository: text().notNull(),
  owner: text().notNull(),
  pr: int().notNull(),
  description: text().notNull()
});

export type GuildsMapKey = Exclude<keyof typeof guildsTable.$inferInsert, 'id'>;

/**
 * A map that contains the labels for keys of the guilds table.
 */
export const guildsLabelMap = new Map<GuildsMapKey, string>([
  ['forum_channel', 'Support Forum'],
  ['ptal_announcement_role', 'PTAL Announcement Role']
]);