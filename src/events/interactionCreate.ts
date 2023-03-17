import { Events, Interaction } from "discord.js";
import { Sequelize } from "sequelize";
import { MyClient, Command } from "../type";

export default {
  name: Events.InteractionCreate,
  async execute(sequelize: Sequelize, interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = (interaction.client as MyClient).commands.get(
      interaction.commandName
    ) as Command;

    if (!command) return;

    try {
      await command.execute(sequelize, interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
