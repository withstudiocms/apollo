import { PullRequest, PullRequestReplies, ReviewStatus } from "@/commands/ptal";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, InteractionReplyOptions, MessageEditOptions } from "discord.js";
import { useDB } from "../global/useDB";
import { guildsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parsePullRequest } from "./parsePullRequest";
import { BRAND_COLOR } from "@/consts";

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

type MakePtalEmbed = (pr: PullRequest,
  reviewList: PullRequestReplies,
  description: string,
  pullRequestUrl: URL,
  user: ChatInputCommandInteraction['user'],
  guildId: string) => Promise<{
    newInteraction: InteractionReplyOptions & {
        fetchReply: true;
    };
    edit: MessageEditOptions;
  }>;

/**
 * Creates an embed and message to be used in the PTAL notifications.
 * @param pr The PR to base the embed on
 * @param reviewList The reviews for the PR
 * @param interaction The discord.js interaction to reply to
 * @returns The embed and message for the PTAL notification
 */
const makePtalEmbed: MakePtalEmbed = async (
  pr,
  reviewList,
  description,
  pullRequestUrl,
  user,
  guildId
) => {
  const db = useDB();
  const data = await db.select().from(guildsTable).where(eq(guildsTable.id, guildId));
  const role = data[0].ptal_announcement_role;

  const splitPath = pullRequestUrl.pathname.split("/pull/");
  const [owner, repo] = splitPath[0].slice(1).split("/");
  const prNumber = Number.parseInt(splitPath[1]);

  const seen = new Map<string, string>();
  const uniqueReviwes = reviewList.filter((item) => {
    if (!item.user) return false;

    const seenReview = seen.get(item.user.login);

    if (seenReview && seenReview === item.state) return false;

    seen.delete(item.user.login);
    seen.set(item.user.login, item.state);

    return true;
  }).filter((review) => review.state !== 'DISMISSED');

  const { reviews, status, title } = parsePullRequest(
    pr, 
    uniqueReviwes.filter((review) => (
      !review.user?.name?.includes("[bot]")
    )),
  );

  const role_ping = role ? `<@&${role}>\n` : '';
  const repoPlusPullRequestId = `${owner}/${repo}#${prNumber}`;

  let message = `${role_ping}# PTAL / Ready for Review\n\n${description}`;

  const embed = new EmbedBuilder({
    author: {
      icon_url: user.avatarURL({ size: 64 }) || user.defaultAvatarURL,
      name: user.username,
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
  
  const viewOnGithub = new ButtonBuilder()
    .setCustomId('ptal-github')
    .setLabel('See on GitHub')
    .setURL(pullRequestUrl.href)
    .setStyle(ButtonStyle.Primary)
    .setEmoji('1329780197385441340');

  const viewFiles = new ButtonBuilder()
    .setCustomId('ptal-github-files')
    .setLabel('View Files')
    .setURL(new URL('files', pullRequestUrl).href)
    .setStyle(ButtonStyle.Primary)
    .setEmoji(':open_file_folder:');
  
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(viewOnGithub, viewFiles);

  return {
    newInteraction: {
      content: message,
      embeds: [embed],
      fetchReply: true,
      components: [row],
      allowedMentions: {
        roles: [role!],
      }
    },
    edit: {
      content: message,
      embeds: [embed],
      components: [row],
      allowedMentions: {
        roles: [role!],
      }
    }
  }
}

export { makePtalEmbed };