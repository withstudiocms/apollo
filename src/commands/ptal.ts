import { BRAND_COLOR } from "@/consts";
import { guildsTable } from "@/db/schema";
import { useDB } from "@/utils/useDB";
import { useGitHub } from "@/utils/useGitHub";
import consola from "consola";
import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { Octokit } from "octokit";

type PullRequestState = 'draft' | 'waiting' | 'approved' | 'changes' | 'merged';

/**
 * Map for converting a PR state to the matching Discord label
 */
const prStatusMap = new Map<PullRequestState, string>([
  ['draft', `:white_circle: Draft`],
  ['approved', `:white_check_mark: Approved`],
  ['changes', `:no_entry_sign: Changes requested`],
  ['merged', `:purple_circle: Merged`],
  ['waiting', `:hourglass: Awaiting reviews`],
]);

enum ReviewStatus {
  COMMENTED = 0,
  APPROVED = 1,
  CHANGES_REQUESTED = 2,
  UNKNOWN = 3
};

type Review = {
  author: string;
  status: ReviewStatus;
};

type ParsedPR = {
  status: {
    type: PullRequestState;
    label: string;
  };
  title: string;
  reviews: Review[];
};

/**
 * Returns the relevant emoji for a given status enum
 * @param status The enum
 * @returns The emoji
 */
const getReviewEmoji = (status: ReviewStatus) => {
  if (status === ReviewStatus.APPROVED) return ":white_check_mark:";
  if (status === ReviewStatus.CHANGES_REQUESTED) return ":no_entry_sign:";
  if (status === ReviewStatus.COMMENTED) return ":speech_balloon:";

  return ":question:";
}

/**
 * Converts a GitHub review status to a type-safe enum
 * @param status The review status from GitHub
 * @returns A review staus enum value
 */
const convertStateToStatus = (status: string): ReviewStatus => {
  if (status === "COMMENTED") return ReviewStatus.COMMENTED;
  if (status === "APPROVED") return ReviewStatus.APPROVED;
  if (status === "CHANGES_REQUESTED") return ReviewStatus.CHANGES_REQUESTED;
  return ReviewStatus.UNKNOWN;
}

/**
 * Handles the logic for parsing the review and PR data to reliably get a status.
 * @param pr The PR data
 * @param reviews The review data
 * @returns A pull request state
 */
const computePullRequestStatus = (
  pr: Awaited<ReturnType<Octokit['rest']['pulls']['get']>>['data'],
  reviews: Awaited<ReturnType<Octokit['rest']['pulls']['listReviews']>>['data'],
): PullRequestState => {
  if (pr.draft) {
    return "draft";
  }

  if (!pr.mergeable || reviews.length === 0 || !reviews.find((x) => x.state === "APPROVED")) {
    return "waiting";
  }

  if (reviews.find((review) => review.state === "CHANGES_REQUESTED")) {
    return "changes";
  }

  if (pr.mergeable && !reviews.find((review) => review.state === "CHANGES_REQUESTED")) {
    return "approved";
  }

  if (pr.merged) {
    return "merged";
  }

  return "waiting";
}

/**
 * Takes in a PR and parses it for easy use in the Discord API.
 * @param pr The pr response data
 * @param reviews The reviews response data
 * @returns Parsed data
 */
const parsePullRequest = (
  pr: Awaited<ReturnType<Octokit['rest']['pulls']['get']>>['data'],
  reviews: Awaited<ReturnType<Octokit['rest']['pulls']['listReviews']>>['data'],
): ParsedPR => {
  let status = computePullRequestStatus(pr, reviews);

  return {
    status: {
      type: status,
      label: prStatusMap.get(status)!,
    },
    title: pr.title,
    reviews: reviews.map((review) => ({
      status: convertStateToStatus(review.state),
      author: review.user?.login || ''
    })),
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

  if (owner !== process.env.GITHUB_USERNAME_OR_ORG) {
    await interaction.reply({
      ephemeral: true,
      content: "PR must be from a repo that belongs to the configured user or organization!"
    });

    return;
  }

  const repoPlusPullRequestId = `${owner}/${repo}#${prNumber}`;

  let pr: Awaited<ReturnType<Octokit['rest']['pulls']['get']>>['data'];
  let reviewList: Awaited<ReturnType<Octokit['rest']['pulls']['listReviews']>>['data'];

  try {
    const [prRes, reviewListRes] = await Promise.all([
      octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      }),
      octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: prNumber,
      })
    ]);

    if (prRes.status !== 200 || reviewListRes.status !== 200) {
      await interaction.reply({
        ephemeral: true,
        content: "Something went wrong while fetching the PR.",
      });
  
      return;
    }

    pr = prRes.data;
    reviewList = reviewListRes.data;
  } catch (err) {
    consola.error(err);

    await interaction.reply({
      ephemeral: true,
      content: "Something went wrong while fetching the PR.",
    });

    return;
  }

  const {
    reviews,
    status,
    title
  } = parsePullRequest(pr, reviewList.filter((review) => review.user?.name?.includes("[bot]")));

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
      { name: "Status", value: status.label },
      { name: "Reviews", value: reviews.map((review) => (
        `${getReviewEmoji(review.status)} [@${review.author}](https://github.com/${review.author})`
      )).join("\n") || "*No reviews yet*" }
    ],
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