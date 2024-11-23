import { BRAND_COLOR } from "@/consts";
import { guildsTable } from "@/db/schema";
import { useDB } from "@/utils/useDB";
import { useGitHub } from "@/utils/useGitHub";
import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { Octokit } from "octokit";

type PullRequestState = 'waiting' | 'approved' | 'changes' | 'merged';

const prStatusMap = new Map<PullRequestState, string>([
  ['approved', `:white_check_mark: Approved`],
  ['changes', `:no_entry_sign: Changes requested`],
  ['merged', `:purple_circle: Merged`],
  ['waiting', `:hourglass: Awaiting reviews`],
]);

type Review = {
  author: string;
  approved: boolean;
};

type ParsedPR = {
  status: {
    type: PullRequestState;
    label: string;
  };
  title: string;
  changeset: {
    exists: boolean;
    label: string;
  };
  reviews: Review[];
}

const parsePullRequest = (
  pr: Awaited<ReturnType<Octokit['rest']['pulls']['get']>>['data']
): ParsedPR => {
  return {
    status: {
      type: "waiting",
      label: prStatusMap.get("waiting")!,
    },
    title: pr.title,
    changeset: {
      exists: false,
      label: ":white_check_mark: Added | *N/A*",
    },
    reviews: [{ approved: false, author: "louisescher" }],
  }
}

/**
 * `/ptal` command handler.
 * @param interaction The interaction event from discord
 */
const handler = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.member || !interaction.guild) {
    await interaction.reply({
      ephemeral: true,
      content: "Something went wrong."
    });

    return;
  };

  const db = useDB();
  const octokit = await useGitHub();
  const pullRequestUrl = new URL(interaction.options.get("github", true).value as string);
  const description = interaction.options.get("description", true);

  if (pullRequestUrl.origin !== "https://github.com" || !pullRequestUrl.pathname.includes("/pull/")) {
    await interaction.reply({
      ephemeral: true,
      content: "GitHub Link must be a valid URL to a PR!"
    });

    return;
  }

  const data = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id));
  const role = data[0].ptal_announcement_role;
  const splitPath = pullRequestUrl.pathname.split("/pull/");
  const [owner, repo] = splitPath[0].slice(1).split("/");
  const prNumber = Number.parseInt(splitPath[1]);

  const repoPlusPullRequestId = `${owner}/${repo}#${prNumber}`;

  const pr = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  if (pr.status !== 200) {
    await interaction.reply({
      ephemeral: true,
      content: "Something went wrong while fetching the PR."
    });

    return;
  }

  const {
    changeset,
    reviews,
    status,
    title
  } = parsePullRequest(pr.data);

  const role_ping = role ? `<@&${role}>\n\n` : '';

  let message = `${role_ping}# PTAL / Ready for Review\n\n${description.value}`;

  const embed = new EmbedBuilder({
    author: {
      icon_url: interaction.user.avatarURL({ size: 64 }) || interaction.user.defaultAvatarURL,
      name: interaction.member.user.username,
    },
    color: BRAND_COLOR,
    fields: [
      { name: "Repository", value: `[${repoPlusPullRequestId}](${pullRequestUrl.toString()})` },
      { name: "Status", value: status.label, inline: true },
      { name: "Changeset", value: changeset.label, inline: true },
      { name: "Reviews", value: reviews.map((review) => (
        `${review.approved ? ':white_check_mark:' : ':no_entry_sign:'} [@${review.author}](https://github.com/${review.author})`
      )).join("\n") }
    ],
    // footer: {
    //   text: "",
    //   icon_url: "",
    // },
    timestamp: Date.now(),
    title,
  });

  await interaction.reply({
    content: message,
    embeds: [embed],
    allowedMentions: { parse: [] },
  });
}

const command = new SlashCommandBuilder();

command
  .setName('ptal')
  .setDescription('Create a new PTAL notification.')
  .addStringOption((option) => {
    option.setName('github');
    option.setDescription("A link to the GitHub PR.");
    option.setMinLength(20); // Minimum of https://github.com/*
    option.setRequired(true);
    
    return option;
  })
  .addStringOption((option) => {
    option.setName('description');
    option.setDescription('The message to send alongside the PTAL announcement. If none is given, the PR description is used.');
    option.setRequired(true);
    
    return option;
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export default {
  builder: command,
  execute: handler,
};