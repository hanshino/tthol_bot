import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { get } from "lodash";
import { Op, Sequelize } from "sequelize";
import npc, {
  monster,
  Npc as TypeNpc,
  Monster as TypeMonster,
} from "../models/monster";
import item, { Item as TypeItem } from "../models/item";
import { MultiResultMenuBuilder } from "../utilities/equip/builder";

const note = [
  { name: "防禦", value: "extraDef" },
  { name: "護勁", value: "magicDef" },
  { name: "跑速", value: "walkSpeed" },
  { name: "攻速", value: "attackSpeed" },
  { name: "攻擊距離", value: "attackRange" },
  { name: "命中", value: "baseHit" },
  { name: "閃躲", value: "baseDodge" },
  { name: "重擊", value: "criticalHit" },
  { name: "拆招", value: "uncannyDodge" },
  { name: "抗衰弱", value: "weakenRes" },
  { name: "抗定身", value: "stunRes" },
  { name: "抗異變", value: "shapeRes" },
  { name: "額外狀態", value: "extraStatus" },
  { name: "經驗", value: "dropExp" },
  { name: "金錢", value: "dropMoney", isVirtual: true },
];

const generateResult = (row: TypeNpc) => {
  const embed = new EmbedBuilder()
    .setTitle(row.getDataValue("name"))
    .addFields(
      { name: "等級", value: `${row.getDataValue("level")}`, inline: true },
      { name: "血量", value: `${row.getDataValue("hp")}`, inline: true }
    )
    .addFields(
      { name: "種族", value: `${get(row, "type")}`, inline: true },
      { name: "屬性", value: `${row.getDataValue("elemental")}`, inline: true }
    )
    .addFields(
      { name: "物攻", value: `${get(row, "damage")}`, inline: true },
      { name: "內勁", value: `${get(row, "pDamage")}`, inline: true },
      { name: "\u200B", value: "\u200B" }
    );
  const fields = note
    .map((field) => {
      const value = field.isVirtual
        ? get(row, field.value, "無")
        : row.getDataValue(field.value);
      const name = field.name;

      return { name, value: `${value || 0}`, inline: true };
    })
    .filter((field) => field.value);

  embed.addFields(fields).setTimestamp();

  return embed;
};

const generateItemResult = (rows: TypeItem[]) => {
  const embed = new EmbedBuilder()
    .setTitle("掉落資訊")
    .setDescription("此數據為古老數據，不一定為準確，請當作參考用！");

  const names = rows.map((row) => row.getDataValue("name"));

  embed.addFields({
    name: "掉落物品",
    value: names.join(", "),
  });

  return embed;
};

const execution = async (
  database: Sequelize,
  interaction: CommandInteraction
) => {
  await interaction.deferReply();
  const options = interaction.options as CommandInteractionOptionResolver;
  const keyword = options.getString("keyword") as string;
  const [NPC, Monster, Item] = [
    npc(database),
    monster(database),
    item(database),
  ];

  const npcResult = await NPC.findAll({
    where: {
      name: {
        [Op.like]: `%${keyword}%`,
      },
    },
  });

  if (npcResult.length === 0) {
    await interaction.editReply("找不到結果");
    return;
  }

  if (npcResult.length > 1) {
    const menu = MultiResultMenuBuilder({
      customId: "monster",
      placeholder: "請選擇一個怪物",
      options: npcResult.map((row) => ({
        label: row.getDataValue("name"),
        value: `${row.getDataValue("id")}`,
      })),
    });

    const message = await interaction.editReply({
      embeds: [],
      components: [menu],
    });

    const filter = (i: any) => i.customId === "monster";
    const collector = message.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (i: any) => {
      const value = i.values[0];
      const row = npcResult.find(
        (row) => row.getDataValue("id") === parseInt(value)
      );

      if (!row) {
        await interaction.editReply("找不到結果");
        return;
      }

      const embeds = [];
      const embed = generateResult(row);
      embeds.push(embed);

      const monsterResult = await Monster.findOne({
        where: {
          id: row.getDataValue("id"),
        },
      });
      if (monsterResult) {
        const dropItems = await Item.findAll({
          where: {
            id: {
              [Op.in]: monsterResult.getDataValue("dropItem"),
            },
            name: {
              [Op.not]: "",
            },
          },
        });

        if (dropItems.length > 0) {
          const itemEmbed = generateItemResult(dropItems);
          embeds.push(itemEmbed);
        }
      }

      await interaction.editReply({
        embeds,
        components: [],
      });
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply("逾時沒選擇");
      }
    });

    return;
  }

  const embeds = [];
  const [row] = npcResult;
  const embed = generateResult(row);
  embeds.push(embed);

  const monsterResult = await Monster.findOne({
    where: {
      id: row.getDataValue("id"),
    },
  });
  if (monsterResult) {
    const dropItems = await Item.findAll({
      where: {
        id: {
          [Op.in]: monsterResult.getDataValue("dropItem"),
        },
        name: {
          [Op.not]: "",
        },
      },
    });

    if (dropItems.length > 0) {
      const itemEmbed = generateItemResult(dropItems);
      embeds.push(itemEmbed);
    }
  }

  await interaction.editReply({
    embeds,
    components: [],
  });
};

const command = {
  name: "monster",
  data: new SlashCommandBuilder()
    .setName("monster")
    .setDescription("查詢怪物資訊")
    .addStringOption((option) =>
      option
        .setName("keyword")
        .setDescription("關鍵字")
        .setRequired(true)
        .setMaxLength(10)
    ),
  execute: execution,
};

export default command;
