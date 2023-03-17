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
    .setDescription(options.description)
    .addFields(...options.fields)
    .setTimestamp();

  if (options.image) {
    embed.setImage(options.image);
  }

  return embed;
};
