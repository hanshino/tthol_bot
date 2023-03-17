import { Events, Client } from "discord.js";
import { Sequelize } from "sequelize";

export default {
  name: Events.ClientReady,
  once: true,
  execute(sequelize: Sequelize, client: Client) {
    console.log(`Logged in as ${client.user?.tag}!`);
  },
};
