import { ptalTable } from "@/db/schema";
import { useDB } from "@/utils/global/useDB";
import { useGitHub } from "@/utils/global/useGitHub";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { and, eq } from "drizzle-orm";
import { createServer } from "node:http";
import { client } from "../index";
import { ChannelType } from "discord.js";
import { EventPayloadMap } from "node_modules/@octokit/webhooks/dist-types/generated/webhook-identifiers";
import { makePtalEmbed } from "@/utils/ptal/makePtalEmbed";
import { editPtalMessage } from "@/utils/ptal/editPtalMessage";

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
      await editPtalMessage(entry, client);
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