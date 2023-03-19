import {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType,
} from "discord.js";
import { Command, MyClient } from "./type";
import { Sequelize } from "sequelize";
import path from "node:path";

const { Guilds, MessageContent, GuildMessages, GuildMembers } =
  GatewayIntentBits;

const client = new Client({
  intents: [Guilds, MessageContent, GuildMessages, GuildMembers],
  presence: {
    activities: [
      {
        name: "tthol.bot | 輸入 (/) 觀看指令",
        type: ActivityType.Playing,
      },
    ],
  },
}) as MyClient;

client.commands = new Collection<string, Command>();

client.database = new Sequelize({
  dialect: "sqlite",
  storage: path.join(process.cwd(), "database", "tthol.sqlite"),
});

export default client;
