import {
  SlashCommandBuilder,
  CommandInteraction,
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
  execute: (database: Sequelize, interaction: CommandInteraction) => void;
}

export interface MyClient extends Client {
  commands: Collection<string, Command>;
  database: Sequelize;
}
