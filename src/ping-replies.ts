import path from "path";
import fs from "fs";
import consola from "consola";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PingReply {
  message: string;
}

/**
 * Collects all activities from the activities directory
 * @returns A parsed collection of activities
 */
const collectReplies = (): PingReply[] => {
  const repliesPath = path.resolve(__dirname, "./ping-replies");
  const repliesDirExists = fs.existsSync(repliesPath);

  if (!repliesDirExists) {
    consola.error("Ping reply directory not found at src/ping-replies.");
  }

  const replyFiles = fs.readdirSync(repliesPath);

  const replies: PingReply[] = [];

  for (const activity of replyFiles) {
    if (!activity.endsWith(".json")) continue;

    const file = fs.readFileSync(path.resolve(repliesPath, activity), { encoding: "utf-8" });

    const json = JSON.parse(file) as PingReply;

    replies.push(json);
  }

  return replies;
}

export { collectReplies };