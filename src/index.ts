import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import consola from 'consola';

import { commands } from './commands';
import { useDB } from './utils/useDB';
import { guildsTable } from './db/schema';
import { startActivityCycle } from './activities';

if (!process.env.DISCORD_APP_TOKEN) {
  throw new Error("DISCORD_APP_TOKEN env must be set!");
}

if (!process.env.DISCORD_CLIENT_ID) {
  throw new Error("DISCORD_CLIENT_ID env must be set!");
}

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds],
});

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_APP_TOKEN);

try {
  consola.info('Started refreshing application (/) commands.');

  await rest.put(
    Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), 
    { body: commands.map((x) => x.builder) } 
  );

  consola.info('Successfully reloaded application (/) commands.');
} catch (error) {
  consola.error(error);
}

client.on('ready', () => {
  if (!client || !client.user) {
    return;
  };

  consola.info(`Logged in as ${client.user.tag}!`);

  startActivityCycle(client);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) return;

  await command.execute(interaction);
});

client.on('guildCreate', async (guild) => {
  const db = useDB();

  await db.insert(guildsTable).values({
    id: guild.id,
  });
});

client.login(process.env.DISCORD_APP_TOKEN);