import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from "@discordjs/builders";

interface MenuOptions {
  customId: string;
  placeholder: string;
  options: {
    label: string;
    value: string;
  }[];
}

export const MultiResultMenuBuilder = (options: MenuOptions) =>
  new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(options.customId)
      .setPlaceholder(options.placeholder)
      .addOptions(options.options)
  );

interface EmbedOptions {
  title: string;
  description: string;
  fields: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  image?: string;
}
export const EquipEmbedBuilder = (options: EmbedOptions) => {
  const embed = new EmbedBuilder()
    .setTitle(options.title)
    .addFields(...options.fields)
    .setTimestamp();

  // ponytail: 8 HORSE and 26 WING rows have an empty summary, and
  // setDescription("") throws "Invalid string length". That throw happens
  // inside the select-menu collector callback, outside interactionCreate's
  // try/catch, so it never reached a log — the user just saw the interaction
  // die. Skip the description when there is nothing to show.
  if (options.description) {
    embed.setDescription(options.description);
  }

  if (options.image) {
    embed.setImage(options.image);
  }

  return embed;
};
