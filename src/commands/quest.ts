import {
  bold,
  codeBlock,
  CommandInteraction,
  CommandInteractionOptionResolver,
  EmbedBuilder,
  inlineCode,
  italic,
  SlashCommandBuilder,
} from "discord.js";
import { Sequelize } from "sequelize";
import { padStart, cloneDeep, chunk } from "lodash";

const forestRooms = ["魁", "晶", "阜", "寶", "彤", "牡", "蒼", "岡"];
const matrix = [
  {
    name: "魁",
    value: -1,
    check: [
      [1, 2],
      [3, 6],
      [4, 8],
    ],
  },
  {
    name: "晶",
    value: -1,
    check: [
      [0, 2],
      [4, 7],
    ],
  },
  {
    name: "阜",
    value: -1,
    check: [
      [0, 1],
      [4, 6],
      [5, 8],
    ],
  },
  {
    name: "寶",
    value: -1,
    check: [
      [0, 6],
      [4, 5],
    ],
  },
  { name: "帝", value: -1, check: [] },
  {
    name: "彤",
    value: -1,
    check: [
      [3, 4],
      [2, 8],
    ],
  },
  {
    name: "牡",
    value: -1,
    check: [
      [0, 3],
      [2, 4],
      [7, 8],
    ],
  },
  {
    name: "蒼",
    value: -1,
    check: [
      [1, 4],
      [6, 8],
    ],
  },
  {
    name: "岡",
    value: -1,
    check: [
      [2, 5],
      [0, 4],
      [6, 7],
    ],
  },
];

const execution = async (
  database: Sequelize,
  interaction: CommandInteraction
) => {
  await interaction.deferReply();
  const options = interaction.options as CommandInteractionOptionResolver;
  const subcommand = options.getSubcommand();

  switch (subcommand) {
    case "sevenstar":
      await sevenstar(interaction);
      break;
    case "forest":
      await forest(interaction);
      break;
    case "godquest":
      await godquest(interaction);
      break;
  }
};

async function sevenstar(interaction: CommandInteraction) {
  const options = interaction.options as CommandInteractionOptionResolver;
  const number = options.getInteger("number") as number;

  let bins = (+number).toString(2);

  let messages = [
    ["一", "二", "三", "四", "五", "六", "七"].join(" "),
    "==================",
    padStart(bins, 7, "0")
      .split("")
      .map((bin) => (bin === "1" ? "開" : "關"))
      .join(" "),
    "==================",
  ];

  await interaction.editReply(codeBlock(messages.join("\n")));
}

async function forest(interaction: CommandInteraction) {
  const options = interaction.options as CommandInteractionOptionResolver;
  const sum = options.getInteger("sum") as number;
  const room1 = options.getString("room1") as string;
  const room2 = options.getString("room2") as string;
  const number1 = options.getInteger("number1") as number;
  const number2 = options.getInteger("number2") as number;
  const result = cloneDeep(matrix);

  result[4].value = sum / 3;

  // 無腦題目處理
  if (number1 === result[4].value && number2 === result[4].value) {
    result.forEach((room) => {
      room.value = sum / 3;
    });
  }

  const placeValue = (room: string, number: number) => {
    const index = result.findIndex((data) => data.name === room);
    result[index].value = number;
  };

  [
    { room: room1, number: number1 },
    { room: room2, number: number2 },
  ].forEach(({ room, number }) => {
    placeValue(room, number);
  });

  // 逐一檢查
  const maxLimit = 10;
  let limit = 0;
  do {
    result.forEach((room) => {
      if (room.value !== -1) return;
      if ([room1, room2, "帝"].includes(room.name)) return;

      room.check.forEach(([room1, room2]) => {
        const room1Value = result[room1].value;
        const room2Value = result[room2].value;

        if (room1Value === -1 || room2Value === -1) return;

        room.value = sum - room1Value - room2Value;
      });
    });

    limit++;

    if (limit > maxLimit) {
      await interaction.editReply("無法解出答案");
      return;
    }
  } while (result.some((room) => room.value === -1));

  const embed = new EmbedBuilder()
    .setTitle("迷霧森林任務解謎")
    .setDescription(
      `任務提示數字總和：${sum} \n固定房間：${inlineCode(
        room1
      )} ${number1} ${inlineCode(room2)} ${number2}`
    )
    .addFields({
      name: "好複製版",
      value: result.map((room) => `${room.name}${room.value}`).join(" "),
    })
    .setTimestamp();

  chunk(result, 3).forEach((rooms) =>
    embed.addFields(
      rooms.map((room) => ({
        name: room.name,
        value: room.value.toString(),
        inline: true,
      }))
    )
  );

  await interaction.editReply({ embeds: [embed] });
}

async function godquest(interaction: CommandInteraction) {
  const options = interaction.options as CommandInteractionOptionResolver;
  const sum = options.getInteger("sum") as number;
  const leak = options.getInteger("leak") as number;
  const result = getGodQuestResult(sum, leak);

  if (result.length === 0) {
    await interaction.editReply("無法解出答案，請檢查任務提示");
    return;
  }

  const [finalResult] = result;
  const message = genGodQuestMessage(finalResult);

  await interaction.editReply(
    [
      bold("神武禁地任務解謎"),
      italic(`${sum}卦 缺口${leak}`),
      codeBlock(message),
    ].join("\n")
  );
}

function getGodQuestResult(sum: number, leak: number) {
  let possibleAry = getAllPossible(sum * 3 - 45, leak);
  let objPossible: number[][] = [];

  possibleAry.forEach((triAry) => {
    for (let i = 0; i < 3; i++) {
      let firstOne = sum - leak - triAry[i] - triAry[(i + 1) % 3];
      if (firstOne > 9 || firstOne <= 0) {
        continue;
      }

      let usedAry = triAry.slice();
      usedAry.push(leak);

      if (usedAry.indexOf(firstOne) !== -1) {
        continue;
      }

      usedAry.push(firstOne);

      let availableNumAry = Array.from(Array(10).keys())
        .slice(1)
        .filter((num) => usedAry.indexOf(num) === -1);
      let a = triAry[i % 3];
      let b = triAry[(i + 1) % 3];
      let c = triAry[(i + 2) % 3];

      let bottom = sum - b - c;

      let bottomResult = availableNumAry.find(
        (num) =>
          availableNumAry.indexOf(bottom - num) !== -1 && bottom - num !== num
      );

      if (bottomResult === undefined || bottomResult === bottom) {
        continue;
      }

      objPossible.push(
        [a, leak, firstOne, b, bottomResult, bottom - bottomResult, c].concat(
          availableNumAry.filter(
            (num) =>
              bottomResult &&
              num !== bottomResult &&
              num !== bottom - bottomResult
          )
        )
      );
    }
  });

  return objPossible;
}

function genGodQuestMessage(result: number[]) {
  let orderDisplay = [[0], [1, 8], [2, 7], [3, 4, 5, 6]];
  return orderDisplay
    .map((idxs) => idxs.map((idx) => result[idx]).join("\t"))
    .join("\n");
}

function getAllPossible(num: number, leak: number) {
  let result: number[][] = [];
  let numAry = Array.from(Array(10).keys()).slice(1);

  let FS = numAry.filter((num) => num !== leak);
  let SS = numAry.filter((num) => num !== leak);

  FS.forEach((first) => {
    SS.forEach((second) => {
      if (first === second) return;
      let third = num - first - second;

      if (third > 9 || third <= 0 || [leak, first, second].includes(third)) {
        return;
      }

      result.push([first, second, third].sort());
    });
  });

  let checkAry: String[] = [];

  result.sort().forEach((data) => {
    let check = data.join();

    if (checkAry.indexOf(check) === -1) {
      checkAry.push(check);
    }
  });

  return checkAry.map((data) => data.split(",").map((str) => parseInt(str)));
}

export default {
  name: "quest",
  data: new SlashCommandBuilder()
    .setName("quest")
    .setDescription("各種任務解謎小工具")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sevenstar")
        .setDescription("腳踩七星，七星迷陣任務解謎")
        .addIntegerOption((option) =>
          option
            .setName("number")
            .setDescription("任務提示數字")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(127)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("forest")
        .setDescription("迷霧森林任務解謎")
        .addIntegerOption((option) =>
          option
            .setName("sum")
            .setDescription("總和提示，通常是 15 or 12")
            .setRequired(true)
            .addChoices({ name: "15", value: 15 }, { name: "12", value: 12 })
        )
        .addStringOption((option) =>
          option
            .setName("room1")
            .setDescription("第一間房間提示")
            .setRequired(true)
            .addChoices(
              ...forestRooms.map((room) => ({ name: room, value: room }))
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("number1")
            .setDescription("第一間房間提示數字")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(9)
        )
        .addStringOption((option) =>
          option
            .setName("room2")
            .setDescription("第二間房間提示")
            .setRequired(true)
            .addChoices(
              ...forestRooms.map((room) => ({ name: room, value: room }))
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("number2")
            .setDescription("第二間房間提示數字")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(9)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("godquest")
        .setDescription("神武禁地任務解謎")
        .addIntegerOption((option) =>
          option
            .setName("sum")
            .setDescription("幾卦（總和）")
            .setRequired(true)
            .setMinValue(17)
            .setMaxValue(23)
        )
        .addIntegerOption((option) =>
          option
            .setName("leak")
            .setDescription("缺口")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(9)
        )
    ),
  execute: execution,
};
