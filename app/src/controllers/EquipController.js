const { Message, MessageReaction } = require("discord.js");
const EquipModel = require("../models/EquipModels");
const memory = require("memory-cache");

/**
 * 查找坐騎
 * @param {Message} Message
 * @param {Object} props
 */
exports.FindDriver = async (Message, props) => {
  let { equip } = props.groups;

  let datas = await EquipModel.getDrivers();
  let results = getEquipByKeyword(datas, equip);

  sendResult(Message, results);
};

/**
 * 查找背飾
 * @param {Message} Message
 * @param {Object} props
 */
exports.FindBack = async (Message, props) => {
  let { equip } = props.groups;

  let data = await EquipModel.getBack();
  let results = getEquipByKeyword(data, equip);

  sendResult(Message, results);
};

/**
 * 透過關鍵字搜尋裝備
 * @param {Array} equipData
 * @param {String} keyword
 * @returns {Object}
 */
function getEquipByKeyword(equipData, keyword) {
  return {
    find: equipData.find(data => data["名稱"] === keyword),
    filter: equipData.filter(data => data["名稱"].indexOf(keyword) !== -1),
  };
}

/**
 * @param {Message} Message
 * @param {Object} results
 * @param {Object|undefined} results.find
 * @param {Array} results.filter
 */
function sendResult(Message, results) {
  let { find: findResult, filter: filterResult } = results;

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
  } else {
    showChoose(Message, filterResult);
  }
}

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

/**
 * @param {Message} Message
 * @param {Object} props
 */
exports.filterBack = async Message => {
  let { attributes: attributeData } = trimAttribute(Message);
  let equipData = await EquipModel.getBack();
  let filterResult = getEquipByFilter(equipData, attributeData);

  return showFilterResult(Message, filterResult);
};

/**
 * @param {Message} Message
 * @param {Object} props
 */
exports.filterDriver = async Message => {
  let { attributes: attributeData } = trimAttribute(Message);
  let equipData = await EquipModel.getDrivers();
  let filterResult = getEquipByFilter(equipData, attributeData);

  return showFilterResult(Message, filterResult);
};

/**
 * @param {Message} Message
 * @param {Array} filterResult
 */
function showFilterResult(Message, filterResult) {
  if (filterResult.length > 1) {
    return showChoose(Message, filterResult);
  } else if (filterResult.length === 1) {
    return Message.channel.send(genEquipMessage(filterResult[0]));
  } else {
    return Message.channel.send("無符合結果，建議調整搜尋條件！");
  }
}

/**
 * 整理出屬性資料
 * @param {Message} Message
 */
function trimAttribute(Message) {
  const { content } = Message;
  let datas = content.split(/\s+/g);
  let order = datas.shift();

  let attributes = datas.map(data => ({
    attribute: data.replace(/\d+/g, ""),
    value: data.replace(/\D+/g, ""),
  }));

  return { order, attributes };
}

/**
 * 透過屬性值篩選出符合的裝備
 * @param {Array} equipData
 * @param {Array<{attribute: String, value: String}>} attributes
 */
function getEquipByFilter(equipData, attributes) {
  return equipData.filter(equip => {
    let isPass = true;
    attributes.forEach(data => {
      if (isPass === false) return;
      let { attribute, value } = data;
      value = parseInt(value);

      let equipKeys = Object.keys(equip);
      attribute = equipKeys.find(key => key.indexOf(attribute) === 0);

      // 無此屬性 不列入篩選
      if (!attribute) {
        isPass = false;
        return;
      }

      let equipValue = parseInt(equip[attribute]);

      if (equipValue < value) {
        isPass = false;
        return;
      }
    });

    return isPass;
  });
}
