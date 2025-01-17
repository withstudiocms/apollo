import { ptalTable } from "@/db/schema";
import { useDB } from "@/utils/global/useDB";
import { useGitHub } from "@/utils/global/useGitHub";
import { makePtalEmbed } from "@/utils/ptal/makePtalEmbed";
import consola from "consola";
import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Octokit } from "octokit";

export type PullRequestState = 'draft' | 'waiting' | 'approved' | 'changes' | 'merged';

export type PullRequest = Awaited<ReturnType<Octokit['rest']['pulls']['get']>>['data'];
export type PullRequestReplies = Awaited<ReturnType<Octokit['rest']['pulls']['listReviews']>>['data'];

export enum ReviewStatus {
  COMMENTED = 0,
  APPROVED = 1,
  CHANGES_REQUESTED = 2,
  UNKNOWN = 3
};

export type Review = {
  author: string;
  status: ReviewStatus;
};

export type ParsedPR = {
  status: {
    type: PullRequestState;
    label: string;
  };
  title: string;
  reviews: Review[];
};

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

  const octokit = await useGitHub();

  const description = interaction.options.get("description", true).value as string;
  const pullRequestUrl = new URL(interaction.options.get("github", true).value as string);

  if (pullRequestUrl.origin !== "https://github.com" || !pullRequestUrl.pathname.includes("/pull/")) {
    await interaction.reply({
      ephemeral: true,
      content: "GitHub Link must be a valid URL to a PR!"
    });

    return;
  }

  const splitPath = pullRequestUrl.pathname.split("/pull/");
  const [owner, repo] = splitPath[0].slice(1).split("/");
  const prNumber = Number.parseInt(splitPath[1]);

  let pr: PullRequest;
  let reviewList: PullRequestReplies;

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

  const { newInteraction } = await makePtalEmbed(pr, reviewList, description, pullRequestUrl, interaction.user, interaction.guild!.id);

  const reply = await interaction.reply(newInteraction);

  if (!reply) return;

  const db = useDB();
  await db.insert(ptalTable).values({
    channel: reply.channel.id,
    description: description,
    message: reply.id,
    owner,
    repository: repo,
    pr: prNumber,
  });
}

const command = new SlashCommandBuilder();

command
  .setName('ptal')
  .setDescription('Creates a PTAL announcement in the current channel and pings the notifications role (if configured).')
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