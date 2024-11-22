import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

const handler = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    ephemeral: true,
    content: "NOT IMPLEMENTED YET!",
  });
}

// Syntax: /ptal github:https://github.com/withstudiocms/studiocms/pull/ID description:Description Here

/**
 * (PFP) Original Author
 * 
 * Title (URL) -> OG Title of PR
 * 
 * **Repository**
 * owner/reponame
 * 
 * **Status**
 * Awaiting Reviews / Reviewed / Approved / Needs changes / Merged
 * 
 * **Changeset**
 * None / Added
 * 
 * **Reviews**
 * (CHECK|NO-EMTRY) @username [Links to User Profile on GH]
 * 
 * Footer: Updated by | Timestamp
 */

const command = new SlashCommandBuilder();

command
  .setName('ptal')
  .setDescription('Create a new PTAL notification.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export default {
  builder: command,
  execute: handler,
};