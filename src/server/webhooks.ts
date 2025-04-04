import { ptalTable } from "@/db/schema";
import { useDB } from "@/utils/global/useDB";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { and, eq } from "drizzle-orm";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { client } from "../index";
import { EventPayloadMap } from "node_modules/@octokit/webhooks/dist-types/generated/webhook-identifiers";
import { editPtalMessage } from "@/utils/ptal/editPtalMessage";

type PullRequestCallback = EventPayloadMap['pull_request'];

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
});
const SERVER_ID_REGEX = /^\/api\/members\/(\d+)$/;

webhooks.onAny((event) => {
  if (
    event.name === 'pull_request' ||
    event.name === 'pull_request_review' ||
    event.name === 'pull_request_review_comment'
  ) {
    handlePullRequestChange(event.payload as PullRequestCallback);
  }
});

async function getMemberCount(serverId: string): Promise<number | null> {
  if (!client.isReady()) return null;

  try {
    const guild = await client.guilds.fetch(serverId);
    return guild.memberCount ?? null;
  } catch (error) {
    console.error("Failed to fetch guild %s:", serverId, error);
    return null;
  }
}

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

const server = createServer(async (req: IncomingMessage, res: ServerResponse) =>  {
  const resolved = await middleware(req, res);
  if (resolved) return;

  // Healthcheck URL
  if (req.url === '/api/healthcheck') {
    res.writeHead(200);
    res.end();
    
    return;
  }

  if (SERVER_ID_REGEX.test(req.url || '')) {
    const serverId = req.url!.match(SERVER_ID_REGEX)?.[1];

    if (!serverId) {
      res.writeHead(400);
      res.end();
      return;
    }

    const memberCount = await getMemberCount(serverId);

    if (memberCount === null) {
      res.writeHead(500);
      res.end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
    });

    res.end(JSON.stringify({ members: memberCount }));
    return;
  }

  res.writeHead(404);
  res.end();
});

export { server };