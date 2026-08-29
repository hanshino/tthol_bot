import { Events, Interaction, MessageFlags } from "discord.js";
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
      // ponytail: every command defers first, so reply() would throw
      // InteractionAlreadyReplied here — and a throw inside this async
      // handler surfaces as an unhandled Client 'error' event that kills
      // the process. Pick the right method, and never let it escape.
      try {
        const content = "There was an error while executing this command!";
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content,
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (notifyError) {
        console.error(notifyError);
      }
    }
  },
};
