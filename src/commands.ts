import { ChatInputCommandInteraction, Collection, SlashCommandBuilder } from "discord.js";

import solved from "./commands/solved";
import settings from "./commands/settings";
import support from "./commands/support";
import ptal from "./commands/ptal";

export type Command = {
  builder: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

const commands = new Collection<string, Command>();

commands.set(solved.builder.name, solved);
commands.set(settings.builder.name, settings);
commands.set(support.builder.name, support);
commands.set(ptal.builder.name, ptal);

export { commands };