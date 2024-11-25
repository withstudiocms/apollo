import { makePtalEmbed, PullRequest } from "@/commands/ptal";
import { ptalTable } from "@/db/schema";
import { useDB } from "@/utils/useDB";
import { useGitHub } from "@/utils/useGitHub";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { and, eq } from "drizzle-orm";
import { createServer } from "node:http";
import { client } from "../index";
import { ChannelType } from "discord.js";
import consola from "consola";
import { EventPayloadMap } from "node_modules/@octokit/webhooks/dist-types/generated/webhook-identifiers";

type PullRequestCallback = EventPayloadMap['pull_request'];

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
});

webhooks.onAny((event) => {
  if (
    event.name === 'pull_request' ||
    event.name === 'pull_request_review' ||
    event.name === 'pull_request_review_comment'
  ) {
    handlePullRequestChange(event.payload as PullRequestCallback);
  }
});

async function handlePullRequestChange(pr: PullRequestCallback) {
  if (!client.isReady()) return;

  const octokit = await useGitHub();
  const db = useDB();

  const data = await db.select().from(ptalTable).where(
    and(
      eq(ptalTable.owner, pr.repository.owner.login), 
      eq(ptalTable.repository, pr.repository.name),
      eq(ptalTable.pr, pr.pull_request.number)
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
      pr.pull_request as PullRequest,
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

const middleware = createNodeMiddleware(webhooks);

const server = createServer(async (req, res) =>  {
  const resolved = await middleware(req, res);
  if (resolved) return;

  // Healthcheck URL
  if (req.url === '/api/healthcheck') {
    res.writeHead(200);
    res.end();
    
    return;
  }

  res.writeHead(404);
  res.end();
});

export { server };