import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const guildsTable = sqliteTable("guilds", {
  id: text().primaryKey().unique().notNull(),
  forum_channel: text(),
  ptal_channel: text(),
});

export type GuildsMapKey = Exclude<keyof typeof guildsTable.$inferInsert, 'id'>;

/**
 * A map that contains the labels for keys of the guilds table.
 */
export const guildsLabelMap = new Map<GuildsMapKey, string>([
  ['forum_channel', 'Support Forum'],
  ['ptal_channel', 'PTAL Announcement Channel']
]);