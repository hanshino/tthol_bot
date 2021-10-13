const { Message, MessageEmbed } = require("discord.js");
const SkillModel = require("../models/SkillModel");

/**
 * 技能搜尋
 * @param {Message} Message
 * @param {Object} props
 */
exports.search = (Message, props) => {
  const { skill } = props.groups;

  if (/^\d+$/.test(skill)) {
    searchById(Message, props);
  } else {
    searchByName(Message, props);
  }
};

/**
 * @param {Message} Message
 * @param {Object} props
 */
async function searchByName(Message, props) {
  const { skill: name, level } = props.groups;
  const result = await SkillModel.searchByName(name);

  if (result.length === 0) {
    return Message.reply("沒有找到任何技能");
  }

  // 如果搜尋結果有多種技能，就讓使用者選擇
  let resultNames = [...new Set(result.map(item => item.name))];
  if (resultNames.length > 1) {
    let multiEmbed = generateMultiResultEmbed(result);
    return Message.channel.send(multiEmbed);
  }

  // 如果沒指定等級，就顯示資料中最高等級的技能
  let target = result[0];
  if (level) {
    target = result.find(skill => skill.level == level);
  }

  let embed = generateEmbed(target);

  return Message.channel.send(embed);
}

/**
 * @param {Message} Message
 * @param {Object} props
 */
function searchById(Message, props) {
  const { skill: id } = props.groups;
  console.log(id);
}

function generateEmbed(target) {
  const embed = new MessageEmbed()
    .setTitle(target.name)
    .setDescription(target.help)
    .addField("等級", target.level, true)
    .setColor("#0099ff");

  // 新增一些欄位說明
  let note = [
    { name: "消耗", value: target.spend_cost },
    { name: "僵直", value: target.stun },
    { name: "時間", value: target.time },
  ];
  // 如果欄位不為空，就新增上去
  note.forEach(field => {
    if (field.value) {
      embed.addField(field.name, field.value, true);
    }
  });

  return embed;
}

function generateMultiResultEmbed(list) {
  let names = [...new Set(list.map(item => item.name))];

  const embed = new MessageEmbed()
    .setTitle("技能搜尋結果")
    .setDescription(names.join("\n"))
    .setColor("#0099ff");

  return embed;
}
