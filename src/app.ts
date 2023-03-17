import { Client, GatewayIntentBits, Collection } from "discord.js";
import { Command, MyClient } from "./type";
import { Sequelize } from "sequelize";
import path from "node:path";

const { Guilds, MessageContent, GuildMessages, GuildMembers } =
  GatewayIntentBits;

const client = new Client({
  intents: [Guilds, MessageContent, GuildMessages, GuildMembers],
}) as MyClient;

client.commands = new Collection<string, Command>();

client.database = new Sequelize({
  dialect: "sqlite",
  storage: path.join(process.cwd(), "database", "tthol.sqlite"),
});

export default client;
