import { makePtalEmbed, PullRequest } from "@/commands/ptal";
import { ptalTable } from "@/db/schema";
import { useDB } from "@/utils/useDB";
import { useGitHub } from "@/utils/useGitHub";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { and, eq } from "drizzle-orm";
import { createServer } from "node:https";
import { client } from "../index";
import { ChannelType } from "discord.js";

type PullRequestCallback = Parameters<Parameters<typeof webhooks.on<'pull_request'>>[1]>[0];

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
});

webhooks.on('pull_request', handlePullRequestChange);

async function handlePullRequestChange(pr: PullRequestCallback) {
  if (!client.isReady()) return;

  const octokit = await useGitHub();
  const db = useDB();

  const data = await db.select().from(ptalTable).where(
    and(
      eq(ptalTable.owner, pr.payload.repository.owner.login),
      eq(ptalTable.repository, pr.payload.repository.name),
      eq(ptalTable.pr, pr.payload.pull_request.number)
    )
  );
  
  if (!data[0]) {
    return;
  }

  try {
    const reviewList = await octokit.rest.pulls.listReviews({
      owner: data[0].owner,
      repo: data[0].repository,
      pull_number: data[0].pr,
    });

    const channel = await client.channels.fetch(data[0].channel, { cache: true });

    if (!channel || channel.type !== ChannelType.GuildText) return;

    const originalMessage = await channel.messages.fetch(data[0].message);

    const { embed, message } = await makePtalEmbed(
      pr.payload.pull_request as PullRequest,
      reviewList.data,
      data[0].description,
      new URL(`https://github.com/${data[0].owner}/${data[0].repository}/pull/${data[0].pr}`),
      originalMessage.author,
      originalMessage.guild.id
    );

    await originalMessage.edit({
      content: message,
      embeds: [embed],
    });
  } catch (err) {
    console.error(err);
  }
}

createServer(createNodeMiddleware(webhooks)).listen(3000);