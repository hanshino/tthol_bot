const { Message } = require("discord.js");
const Monster = require("../models/MonsterModel");
const Npc = require("../models/NpcModel");

/**
 * 顯示怪物資訊
 * @param {Message} Message
 */
exports.showMonster = async (Message, props) => {
  const { monster: keyword } = props.groups;
  const { author } = Message;

  const results = /^\d+$/.test(keyword)
    ? await Npc.searchById(keyword)
    : await Npc.searchByName(keyword);

  if (results.length === 1) {
    return sendMonster(Message, results[0]);
  }

  if (results.length === 0) {
    return Message.channel.send(`<@${author.id}> 查無相對應的結果，建議可輸入部分關鍵字即可`);
  }

  let response = results.map(npc => `${npc.name}(${npc.id})`);
  return Message.channel.send(
    `<@${author.id}> 多種結果，建議使用id查詢\`.怪物 11286\` \n\`\`\`${response.join("、")}\`\`\``
  );
};

/**
 * 發送查詢結果
 * @param {Message} Message
 * @param {Object} monster
 */
function sendMonster(Message, monster) {
  const { author } = Message;
  let skipKeys = [
    "pic",
    "type",
    "sub_type",
    "extra_status",
    "status_prob",
    "move_sound",
    "atta_sound",
    "hurt_sound",
    "dead_sound",
  ];

  let response = Npc.config
    .filter(
      config => skipKeys.indexOf(config.key) === -1 && monster[config.key] // 不在略過清單 and 有值
    )
    .map(config => `${config.note}：${monster[config.key]}`);

  return Message.channel.send(
    `<@${author.id}> 您要查詢的是 ${monster.name}\n\`\`\`${response.join("\n")}\`\`\``
  );
}
