import { ChatInputCommandInteraction, Collection, SlashCommandBuilder } from "discord.js";
import solved from "./commands/solved";
import settings from "./commands/settings";

export type Command = {
  builder: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

const commands = new Collection<string, Command>();

commands.set(solved.builder.name, solved);
commands.set(settings.builder.name, settings);

export { commands };