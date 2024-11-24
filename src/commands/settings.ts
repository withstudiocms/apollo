import { BRAND_COLOR } from "@/consts";
import { guildsLabelMap, GuildsMapKey, guildsTable } from "@/db/schema";
import { useDB } from "@/utils/useDB";
import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";

/**
 * Formats a value based on the guild map key.
 * @param key The key that the value should be formatted with
 * @param value The value to be formatted
 * @returns A string ready to be used in an embed or otherwise
 */
const formatValueBasedOnKey = (key: GuildsMapKey, value: string | null): string => {
  if (!value) return "*Unset*";

  if (key === 'forum_channel') {
    return `<#${value}>`;
  }

  if (key === 'ptal_announcement_role') {
    return `<@&${value}>`;
  }

  return "*Unsets*";
}

/**
 * `/settings` command handler.
 * @param interaction The interaction event from discord
 */
const handler = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);

  if (!interaction.guild) return;

  const db = useDB();

  if (subcommand === 'set-forum') {
    const forumChannel = interaction.options.getChannel('forum', true);
    
    await db.update(guildsTable)
      .set({ forum_channel: forumChannel.id })
      .where(eq(guildsTable.id, interaction.guild.id));

    await interaction.reply({
      ephemeral: true,
      content: "Channel configured successfully."
    });
  }

  if (subcommand === 'set-ptal-role') {
    const role = interaction.options.getRole('role', true);
    
    await db.update(guildsTable)
      .set({ ptal_announcement_role: role.id })
      .where(eq(guildsTable.id, interaction.guild.id));

    await interaction.reply({
      ephemeral: true,
      content: "Role configured successfully."
    });
  }

  if (subcommand === 'print') {
    const data = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id));

    const keys = Object.keys(data[0]).filter((key) => key !== 'id') as GuildsMapKey[];

    const embed = new EmbedBuilder({
      title: `Current Settings for ${interaction.guild.name}`,
      color: BRAND_COLOR,
      fields: keys.map((key) => ({
        name: guildsLabelMap.get(key)!,
        value: formatValueBasedOnKey(key, data[0][key]),
        inline: true,
      })),
    });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}

const command = new SlashCommandBuilder();

command
  .setName('settings')
  .setDescription('Command which carries the sub-commands for configuring the bot.')
  .addSubcommand((subcommand) => {
    subcommand.setName("set-forum");
    subcommand.setDescription("Sets the support form.");
    subcommand.addChannelOption((option) => {
      option.addChannelTypes(ChannelType.GuildForum);
      option.setName("forum");
      option.setDescription("The channel where support requests are answered.");
      option.setRequired(true);
  
      return option;
    });

    return subcommand;
  })
  .addSubcommand((subcommand) => {
    subcommand.setName("set-ptal-role");
    subcommand.setDescription("Sets the role that gets pinged when a new PTAL announcement is sent.");
    subcommand.addRoleOption((option) => {
      option.setName("role");
      option.setDescription("The role that should get pinged.");
      option.setRequired(true);
  
      return option;
    });

    return subcommand;
  })
  .addSubcommand((subcommand) => {
    subcommand.setName("print");
    subcommand.setDescription("Prints an overview of all settings.");

    return subcommand;
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export default {
  builder: command,
  execute: handler,
};