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
    console.log(event.payload.pull_request, "Event received")
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
  
  if (data.length === 0) {
    return;
  }

  for (const entry of data) {
    try {
      const [pullReq, reviewList] = await Promise.all([
        octokit.rest.pulls.get({
          owner: pr.repository.owner.login,
          repo: pr.repository.name,
          pull_number: entry.pr,
        }),
        await octokit.rest.pulls.listReviews({
          owner: entry.owner,
          repo: entry.repository,
          pull_number: entry.pr,
        })
      ]);
  
      const channel = await client.channels.fetch(entry.channel, { cache: true });
  
      if (!channel || channel.type !== ChannelType.GuildText) return;
  
      const originalMessage = await channel.messages.fetch(entry.message);
  
      const { embed, message } = await makePtalEmbed(
        pullReq.data,
        reviewList.data,
        entry.description,
        new URL(`https://github.com/${entry.owner}/${entry.repository}/pull/${entry.pr}`),
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