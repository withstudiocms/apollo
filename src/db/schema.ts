import { sqliteTable, text, int } from "drizzle-orm/sqlite-core";

export const guildsTable = sqliteTable("guilds", {
  id: text().primaryKey().unique().notNull(),
  forum_channel: text(),
  ptal_announcement_role: text(),
  join_role: text(),
  join_role_min_messages: int(),
  join_role_min_duration: int(),
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

export const messagesByAuthorTable = sqliteTable('messages_by_author', {
  id: int().primaryKey({ autoIncrement: true }),
  guild: text().notNull(),
  author: text().notNull(),
  messages: int().notNull().default(0),
});

export type GuildsMapKey = Exclude<keyof typeof guildsTable.$inferInsert, 'id'>;

/**
 * A map that contains the labels for keys of the guilds table.
 */
export const guildsLabelMap = new Map<GuildsMapKey, string>([
  ['forum_channel', 'Support Forum'],
  ['ptal_announcement_role', 'PTAL Announcement Role'],
  ['join_role', 'Join Role'],
  ['join_role_min_messages', 'Min. Messages for Join Role'],
  ['join_role_min_duration', 'Min. Duration for Join Role']
]);