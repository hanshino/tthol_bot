import { Events, Interaction, MessageFlags } from "discord.js";
import { Sequelize } from "sequelize";
import { MyClient, Command } from "../type";
import { dispatchInteraction, registerDefaultSuggesters } from "../routing/router";

export default {
  name: Events.InteractionCreate,
  async execute(sequelize: Sequelize, interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const command = (interaction.client as MyClient).commands.get(interaction.commandName) as Command;
      if (!command) return;
      try { await command.execute(sequelize, interaction); }
      catch (error) {
        console.error(error);
        try {
          const payload = { content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral as const, allowedMentions: { parse: [] as never[] } };
          if (interaction.deferred || interaction.replied) await interaction.followUp(payload); else await interaction.reply(payload);
        } catch (notifyError) { console.error(notifyError); }
      }
      return;
    }
    if (interaction.isAutocomplete()) registerDefaultSuggesters(sequelize);
    try { await dispatchInteraction(sequelize, interaction); }
    catch (error) { console.error(error); }
  },
};
