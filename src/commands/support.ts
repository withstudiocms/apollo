import { guildsTable } from "@/db/schema";
import { useDB } from "@/utils/global/useDB";
import { ChannelType, ChatInputCommandInteraction, GuildChannel, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";

/**
 * `/support` command handler.
 * @param interaction The interaction event from discord
 */
const handler = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.channel || !interaction.guild || !interaction.member) return;

  const title = interaction.options.get('title', true);
  const messageId = interaction.options.get('message', true);
  
  const originalMessage = await interaction.channel.messages.fetch(messageId.value as string);

  const db = useDB();
  const data = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id));

  if (!data[0].forum_channel) {
    await interaction.reply({
      ephemeral: true,
      content: "No support forums channel has been registered yet!"
    });

    return;
  }

  const forumChannel = await interaction.guild.channels.fetch(data[0].forum_channel);

  if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
    await interaction.reply({
      ephemeral: true,
      content: "Failed to move message."
    });

    return;
  }

  const thread = await forumChannel.threads.create({
    name: title.value!.toString(),
    message: { content: `<@${originalMessage.author.id}> said:\n\n${originalMessage.content}\n\n-# Created by <@${interaction.member.user.id}>` }
  });

  await interaction.reply({
    content: `A new support thread has been created: <#${thread.id}>`
  });
}

const command = new SlashCommandBuilder();

command
  .setName('support')
  .setDescription('Creates a new post in the support forum based on the message you supply.')
  .addStringOption((option) => {
    option.setName("title");
    option.setDescription("The title of the new post.");
    option.setRequired(true);

    return option;
  })
  .addStringOption((option) => {
    option.setName("message");
    option.setDescription("The UID of the original message to be used as the post description. Must be from the same channel.");
    option.setRequired(true);

    return option;
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export default {
  builder: command,
  execute: handler,
};