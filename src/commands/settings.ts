import { BRAND_COLOR } from "@/consts";
import { guildsLabelMap, GuildsMapKey, guildsTable } from "@/db/schema";
import { useDB } from "@/utils/global/useDB";
import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import parse from 'parse-duration';
import prettyMS from 'pretty-ms';

/**
 * Formats a value based on the guild map key.
 * @param key The key that the value should be formatted with
 * @param value The value to be formatted
 * @returns A string ready to be used in an embed or otherwise
 */
const formatValueBasedOnKey = <T extends GuildsMapKey>(key: T, value: typeof guildsTable.$inferInsert[T]): string => {
  if (!value) return "*Unset*";

  if (key === 'forum_channel') {
    return `<#${value}>`;
  }

  if (key === 'ptal_announcement_role') {
    return `<@&${value}>`;
  }

  if (key === 'join_role') {
    return `<@&${value}>`;
  }

  if (key === 'join_role_min_duration') {
    return prettyMS(value as number);
  }

  if (key === 'join_role_min_messages') {
    return `${value} messages`;
  }

  return "*Unset*";
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
    
    await db.update(guildsTable).set({ 
      forum_channel: forumChannel.id 
    }).where(eq(guildsTable.id, interaction.guild.id));

    return await interaction.reply({
      ephemeral: true,
      content: "Channel configured successfully."
    });
  }

  if (subcommand === 'set-ptal-role') {
    const role = interaction.options.getRole('role', true);
    
    await db.update(guildsTable).set({
      ptal_announcement_role: role.id
    }).where(eq(guildsTable.id, interaction.guild.id));

    return await interaction.reply({
      ephemeral: true,
      content: "PTAL notification role configured successfully."
    });
  }

  if (subcommand === 'set-join-role') {
    const role = interaction.options.getRole('role', true);
    const minDuration = interaction.options.getString('duration', false);
    const minMessages = interaction.options.getString('messages', false);
    
    const durationInMS = parse(minDuration || '0d');
    
    if (minDuration && !durationInMS) {
      return await interaction.reply({
        ephemeral: true,
        content: `Couldn't parse given duration.`
      });
    }

    const parsedMessages = Number.parseInt(minMessages || "0");

    if (minMessages && Number.isNaN(parsedMessages)) {
      return await interaction.reply({
        ephemeral: true,
        content: `Given messages option is not a number.`
      });
    }

    await db.update(guildsTable).set({
      join_role: role.id,
      join_role_min_duration: durationInMS === 1 ? null : durationInMS,
      join_role_min_messages: parsedMessages === 0 ? null : parsedMessages
    }).where(eq(guildsTable.id, interaction.guild.id));

    return await interaction.reply({
      ephemeral: true,
      content: "Join role configured successfully."
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

    return await interaction.reply({
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
    subcommand.setName("set-join-role");
    subcommand.setDescription("Sets the role that a user receives when they join the server.");
    subcommand.addRoleOption((option) => {
      option.setName("role");
      option.setDescription("The role that should be given to the user.");
      option.setRequired(true);
  
      return option;
    });

    subcommand.addStringOption((option) => {
      option.setName("messages");
      option.setDescription("The amount of messages the user has to send before they receive the role. Default is 0.");
      option.setRequired(false);
      option.addChoices([
        { name: "0 Messages (Immediately)", value: "0" },
        { name: "10 Messages", value: "10" },
        { name: "50 Messages", value: "50" },
      ]);
  
      return option;
    });

    subcommand.addStringOption((option) => {
      option.setName("duration");
      option.setDescription("How long the user needs to have been on the server for. Default is 0.");
      option.setRequired(false);
      option.addChoices([
        { name: "0 Minutes (Immediately)", value: '1ms' },
        { name: "10 Minutes", value: '10m' },
        { name: "1 Hour", value: '1h' },
        { name: "12 Hours", value: '12h' },
        { name: "1 Day", value: '1d' },
        { name: "3 Days", value: '3d' },
        { name: "1 Week", value: '1w' },
        { name: "2 Weeks", value: '2w' },
        { name: "1 Month", value: '4w' },
      ]);
  
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