import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import consola from 'consola';
import { commands } from './commands';
import { useDB } from './utils/global/useDB';
import { guildsTable, messagesByAuthorTable } from './db/schema';
import { startActivityCycle } from './activities';
import { checkRequiredENVs } from './utils/global/checkRequiredENVs';
import { server } from './server/webhooks';
import { checkPtalMessages } from './utils/ptal/checkPtalMessages';
import { and, eq } from 'drizzle-orm';
import { collectReplies } from './ping-replies';

const { valid, message } = checkRequiredENVs();

if (!valid) {
  throw new Error(message);
}

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration],
});

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_APP_TOKEN);
const messages = collectReplies();

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
  checkPtalMessages(client);
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

client.on('guildMemberAdd', async (member) => {
  console.log("Member joined", member);
  if (member.user.bot || !member.user || !member.guild) return;

  const db = useDB();
  const data = await db.select().from(guildsTable).where(eq(guildsTable.id, member.guild.id));
  const settings = data[0];

  if (!settings.join_role) return;
  if (settings.join_role_min_duration || settings.join_role_min_messages) return;

  try {
    member.roles.add(settings.join_role);
  } catch(err) {} // Silent fail if the bot does not have the proper permissions to add the role.
});

client.on('messageCreate', async (interaction) => {
  if (interaction.author.bot || !interaction.member || !interaction.guild) return;

  const db = useDB();
  const data = await db.select().from(guildsTable).where(eq(guildsTable.id, interaction.guild.id));
  const settings = data[0];

  if (!settings.join_role) return;

  if (interaction.member.roles.cache.has(settings.join_role)) return;

  const userEntry = await db.select().from(messagesByAuthorTable).where(
    and(
      eq(messagesByAuthorTable.guild, interaction.guild.id),
      eq(messagesByAuthorTable.author, interaction.author.id),
    )
  );

  if (!userEntry[0]) {
    await db.insert(messagesByAuthorTable).values({
      author: interaction.author.id,
      guild: interaction.guild.id,
      messages: 1,
    });

    return;
  }

  let shouldReceiveRole = false;

  const meetsMinimumMessageAmountRequirement = settings.join_role_min_messages && (userEntry[0].messages + 1) >= settings.join_role_min_messages;
  const meetsMinimumDurationAmountRequirement = (
    interaction.member.joinedAt && settings.join_role_min_duration && 
    Date.now() - settings.join_role_min_duration > interaction.member.joinedAt.getDate()
  );

  // If no minimum amount of messages is set, and the user meets the minimum duration requirement
  if (!settings.join_role_min_messages && meetsMinimumDurationAmountRequirement) {
    shouldReceiveRole = true;
  }

  // If no minimum duration is set, and the user meets the minimum messages requirement
  if (!settings.join_role_min_duration && meetsMinimumMessageAmountRequirement) {
    shouldReceiveRole = true;
  }

  // If both requirements are set and met
  if (meetsMinimumMessageAmountRequirement && meetsMinimumDurationAmountRequirement) {
    shouldReceiveRole = true;
  }

  if (shouldReceiveRole) {
    try {
      await interaction.member.roles.add(settings.join_role);
    } catch(err) {
      consola.error(err);
    }

    await db.delete(messagesByAuthorTable).where(
      and(
        eq(messagesByAuthorTable.author, interaction.author.id),
        eq(messagesByAuthorTable.guild, interaction.guild.id)
      )
    )
  } else {
    await db.update(messagesByAuthorTable).set({
      author: interaction.author.id,
      guild: interaction.guild.id,
      messages: userEntry[0].messages + 1,
    }).where(
      and(
        eq(messagesByAuthorTable.author, interaction.author.id),
        eq(messagesByAuthorTable.guild, interaction.guild.id)
      )
    );
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.mentions.has(client.user!)) {
    message.reply(messages[Math.floor(Math.random() * messages.length)].message);
  }
});

client.login(process.env.DISCORD_APP_TOKEN);

server.listen(3000);

export { client };