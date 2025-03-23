import { PullRequest, PullRequestReplies, ReviewStatus } from "@/commands/ptal";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, InteractionReplyOptions, MessageEditOptions } from "discord.js";
import { useDB } from "../global/useDB";
import { guildsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parsePullRequest } from "./parsePullRequest";
import { BRAND_COLOR } from "@/consts";
import { client } from "@/index";

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
    newInteraction: InteractionReplyOptions;
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
  const uniqueReviews = reviewList.filter((item) => {
    if (!item.user) return false;

    const seenReview = seen.get(item.user.login);

    if (seenReview && seenReview === item.state) return false;

    seen.delete(item.user.login);
    seen.set(item.user.login, item.state);

    return true;
  }).filter((review) => review.state !== 'DISMISSED');

  const { reviews, status, title, color } = parsePullRequest(pr, seen);

  const role_ping = role ? `<@&${role}>\n` : '';

  let message = `${role_ping}# PTAL / Ready for Review\n\n${description}`;

  const embed = new EmbedBuilder({
    color: color,
    fields: [
      { name: "Repository", value: `[${owner}/${repo}](${pullRequestUrl.toString().split("/pull/")[0]})` },
      { name: "Status", value: status.label },
      { name: "Reviews", value: reviews.map((review) => (
        `${getReviewEmoji(review.status)} [@${review.author}](https://github.com/${review.author})`
      )).join("\n") || "*No reviews yet*" }
    ],
    timestamp: Date.now(),
    title,
  });
  
  const viewOnGithub = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel('See on GitHub')
    .setURL(pullRequestUrl.href);
  
  if (client.emojis.resolve('1329780197385441340')) {
    viewOnGithub.setEmoji('<:github:1329780197385441340>');
  }

  const viewFiles = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel('View Files')
    .setURL(new URL(`${pullRequestUrl.href}/files`).href);
  
  const row = new ActionRowBuilder<ButtonBuilder>({
    components: [viewOnGithub, viewFiles]
  });

  return {
    newInteraction: {
      content: message,
      embeds: [embed],
      withResponse: true,
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