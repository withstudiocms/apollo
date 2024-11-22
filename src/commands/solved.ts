import { BRAND_COLOR } from "@/consts";
import { createId } from "@/utils/createId";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, ComponentType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

/**
 * `/solved` command handler.
 * @param interaction The interaction event from discord
 */
const handler = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.channel || !interaction.guild) return;

  if (interaction.channel.type !== ChannelType.PublicThread) {
    await interaction.reply({
      ephemeral: true,
      content: "This command can only be used in a forum channel.",
    });

    return;
  }

  const op = await interaction.channel.fetchOwner();

  if (!op) return;

  const embed = new EmbedBuilder({
    color: BRAND_COLOR,
    description: "Hi there! If your issue has been solved, please click the button to close this post.",
    timestamp: Date.now(),
    title: "Is your issue resolved?",
  });

  const confirmButtonId = createId('button', 'solved', 'confirmation');
  const confirmationButton = new ButtonBuilder({
    custom_id: confirmButtonId,
    label: 'Solved',
    style: ButtonStyle.Success,
  });

  const cancellationButtonId = createId('button', 'solved', 'cancellation');
  const cancellationButton = new ButtonBuilder({
    custom_id: cancellationButtonId,
    label: 'Cancel',
    style: ButtonStyle.Secondary 
  })

  const row = new ActionRowBuilder<ButtonBuilder>({
    components: [confirmationButton, cancellationButton]
  });

  const response = await interaction.reply({
    embeds: [embed],
    components: [row]
  });

  const collector = response.createMessageComponentCollector({ 
    componentType: ComponentType.Button,
    time: 2_147_483_647, // Time in seconds, set to max. 32-bit integer
  });

  collector.on('collect', async (i) => {
    if (!i.member || !i.channel) return;
    if (i.channel.type !== ChannelType.PublicThread) return;
    if (i.member.user.id !== op.id) return;

    if (i.customId === confirmButtonId) {
      await i.message.delete();

      const solvedEmbed = new EmbedBuilder({
        color: BRAND_COLOR,
        description: "You can hide this post from your channel list now. \nPlease do not delete the post, as it might be helpful to someone else one day!",
        timestamp: Date.now(),
        title: "Issue has been marked as solved.",
      });

      await i.channel.send({
        embeds: [solvedEmbed],
      });
      
      try {
        await i.channel.edit({
          archived: true,
        });
      } catch (e) {} // Empty in case solve gets used on an already archived thread
    }

    if (i.customId === cancellationButtonId) {
      await i.message.delete();
    }
  })
}

const command = new SlashCommandBuilder();

command
  .setName('solved')
  .setDescription('Sends an embed with buttons so the OP can close the request.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export default {
  builder: command,
  execute: handler,
};