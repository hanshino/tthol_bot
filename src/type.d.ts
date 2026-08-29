import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Collection,
  PermissionResolvable,
  Message,
  AutocompleteInteraction,
  Client,
} from "discord.js";
import { Sequelize } from "sequelize";

export interface Command {
  name: string;
  data: SlashCommandBuilder;
  execute: (database: Sequelize, interaction: ChatInputCommandInteraction) => void;
}

export interface MyClient extends Client {
  commands: Collection<string, Command>;
  database: Sequelize;
}
