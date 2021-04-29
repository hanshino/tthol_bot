const { Message, MessageReaction } = require("discord.js");
const EquipModel = require("../models/EquipModels");
const memory = require("memory-cache");

/**
 * 查找裝備
 * @param {Message} Message
 */
exports.FindDriver = async (Message, props) => {
  let { equip } = props.groups;

  console.log(`開始尋找 ${equip}`);

  let datas = await EquipModel.getDrivers();
  let findResult = datas.find(data => data["名稱"] === equip);
  let filterResult = datas.filter(data => data["名稱"].indexOf(equip) !== -1);

  if (!findResult && filterResult.length === 0) {
    return Message.channel.send("找不到裝備");
  }

  if (findResult) {
    Message.channel.send(genEquipMessage(findResult));
    return;
  }

  if (filterResult.length === 1) {
    findResult = filterResult[0];
    Message.channel.send(genEquipMessage(findResult));
    return;
  } else {
    showChoose(Message, filterResult);
  }
};

/**
 * @param {MessageReaction} MessageReaction
 */
exports.ShowNext = MessageReaction => controlEquipView(MessageReaction, "next");
exports.ShowPre = MessageReaction => controlEquipView(MessageReaction, "per");

/**
 * @param {MessageReaction} MessageReaction
 * @param {String} action
 */
async function controlEquipView(MessageReaction, action = "next") {
  let { id } = MessageReaction.message;
  let memData = memory.get(id);
  if (memData === null) return;

  let { viewer, offset, datas } = memData;

  if (action === "next") {
    offset++;
  } else {
    offset--;
  }
  offset = (offset + datas.length) % datas.length;

  await MessageReaction.message.channel.messages.fetch(viewer).then(Message => {
    return Message.edit(genEquipMessage(datas[offset]));
  });

  MessageReaction.users.remove(MessageReaction.author);
  memory.put(id, { viewer, offset, datas });
}

/**
 * 顯示選擇畫面
 * @param {Message} Message
 * @param {Array} results
 */
async function showChoose(Message, results) {
  let msg = await Message.channel.send("有多筆結果！如果這不是你要的請選擇 ⏩");

  await msg.react("⏪");
  await msg.react("⏩");

  let showMessage = await Message.channel.send(genEquipMessage(results[0]));

  memory.put(msg.id, { viewer: showMessage.id, offset: 0, datas: results }, 60 * 60 * 1000);
}

function genEquipMessage(equipData) {
  let image = equipData["新版圖片"] || equipData["圖片網址"];

  if (image) {
    return image;
  }

  let information = Object.keys(equipData)
    .map(key => ({ key, value: equipData[key] }))
    .filter(data => data.value)
    .map(data => `${data.key}: ${data.value}`)
    .join("\n");

  return `\`\`\`\n${information}\n\`\`\``;
}
