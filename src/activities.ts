import consola from "consola";
import { ActivitiesOptions, Client, ActivityType as DiscordActivityType } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'url';
import { shuffle } from "./utils/global/shuffle";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ActivityType = "playing" | "streaming" | "listening" | "watching" | "competing" | "custom";

interface ApolloActivity {
  $schema: string;
  type: ActivityType;
  name: string;
  details?: string;
  duration?: number;
};

/**
 * Maps json activity types to Discord enum
 */
const apolloActivityTypeMap = new Map<ActivityType, DiscordActivityType>([
  ['competing', DiscordActivityType.Competing],
  ['listening', DiscordActivityType.Listening],
  ['playing', DiscordActivityType.Playing],
  ['streaming', DiscordActivityType.Streaming],
  ['watching', DiscordActivityType.Watching],
  ['custom', DiscordActivityType.Custom],
]);

/**
 * Maps Discord activity enums to respective labels
 */
const discordActivityTypeStrings = new Map<DiscordActivityType, string>([
  [DiscordActivityType.Competing, "Competing in "],
  [DiscordActivityType.Listening, "Listening to "],
  [DiscordActivityType.Playing, "Playing "],
  [DiscordActivityType.Streaming, "Streaming "],
  [DiscordActivityType.Watching, "Watching "],
  [DiscordActivityType.Custom, ""],
]);

/**
 * Collects all activities from the activities directory
 * @returns A parsed collection of activities
 */
const collectActivities = (): ApolloActivity[] => {
  const activitiesPath = path.resolve(__dirname, "./activities");
  const activitiesDirExists = fs.existsSync(activitiesPath);

  if (!activitiesDirExists) {
    consola.error("Activities directory not found at src/activities.");
  }

  const activityFiles = fs.readdirSync(activitiesPath);

  const activities: ApolloActivity[] = [];

  for (const activity of activityFiles) {
    if (!activity.endsWith(".json")) continue;

    const file = fs.readFileSync(path.resolve(activitiesPath, activity), { encoding: "utf-8" });

    const json = JSON.parse(file) as ApolloActivity;

    activities.push(json);
  }

  return activities;
}

/**
 * Parses an ApolloActivity to a discord.js accepted activity option.
 * @param activity The activity to parse
 * @returns An API-ready activity option
 */
const parseActivity = (activity: ApolloActivity): ActivitiesOptions => {
  return {
    type: apolloActivityTypeMap.get(activity.type),
    name: activity.name,
    state: activity.details,
  };
}

/**
 * Starts the activity cycle.
 * @param client The discord.js client
 */
const startActivityCycle = async (client: Client) => {
  if (!client.user) {
    consola.error("Unable to start activities cylce due to missing user.");
    return;
  }

  const activities = shuffle(collectActivities());
  
  for (const activity of activities) {
    const presence = client.user.setActivity(parseActivity(activity));
    const activityInfo = presence.activities[0];

    consola.info(`Activity set to "${discordActivityTypeStrings.get(activityInfo.type)!}${activityInfo.name}"`);

    await new Promise((resolve) => setTimeout(
      resolve, 
      activity.duration 
        ? activity.duration * 1000 
        : 45_000,
    ));
  }

  startActivityCycle(client);
}

export { collectActivities, parseActivity, startActivityCycle };