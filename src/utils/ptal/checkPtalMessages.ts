import { ptalTable } from '@/db/schema';
import { useDB } from '../global/useDB';
import { editPtalMessage } from './editPtalMessage';
import { Client } from 'discord.js';

/**
 * Checks the database and updates all messages, deletes them from the DB if merged
 * 
 * @param client The Discord.js client
 */
const checkPtalMessages = async (client: Client) => {
  const db = useDB();

  const ptalMessages = await db.select().from(ptalTable);

  for (const message of ptalMessages) {
    try {
      const channel = await client.channels.fetch(message.channel);
      
      if (!channel) continue;

      await editPtalMessage(message, client);
    } catch (err) {} // Silent fail. We expect this to happen whenever the client is unable to access a channel, which is bound to happen with multiple servers.
  }
}

export { checkPtalMessages };