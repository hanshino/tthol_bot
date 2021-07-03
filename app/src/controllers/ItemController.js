const { Message } = require("discord.js");
const Item = require("../models/ItemModel");
const Monster = require("../models/MonsterModel");
const ItemConfig = Item.getConfig();

/**
 * 偵測是否有此物品
 * @param {Message} Message
 */
exports.detect = async Message => {
  if (!Message.content.startsWith(".")) return false;
  const { content } = Message;
  let result = await Item.search(content.slice(1));

  return result.length !== 0;
};

/**
 * 顯示出物品資訊
 * @param {Message} Message
 */
exports.showItem = async (Message, props) => {
  const { item: keyword } = props.groups;
  const result = /^\d+$/.test(keyword)
    ? await Item.searchById(keyword)
    : await Item.search(keyword);
  let { author } = Message;

  if (result.length === 1) {
    return await sendItem(Message, result[0]);
  }

  if (result.length > 100) {
    return Message.channel.send(`<@${author.id}> 查詢的結果過多，請增加關鍵字！`);
  }

  let names = result.map(data => data.name);

  // 沒有完全吻合，代表使用者不確定物品
  let idx = names.indexOf(keyword);
  if (idx === -1 && names.length > 1) {
    return Message.channel.send(
      `<@${author.id}> 多種結果，建議使用\`.物品 20011\`的方式查詢\n\`\`\`${result
        .map(data => `${data.name}(${data.id})`)
        .join("、")}\`\`\``
    );
  }

  let item = idx === -1 ? result[0] : result[idx];
  await sendItem(Message, item);
};

async function sendItem(Message, item) {
  const { author } = Message;
  let skipKeys = ["id", "note"];
  let response = [];
  response = ItemConfig.filter(
    config => skipKeys.indexOf(config.key) === -1 && item[config.key] // 不在略過清單 and 有值
  ).map(config => `${config.note}：${item[config.key]}`);

  let sourceMonsters = await Monster.searchDropItem(item.id);

  // 此物品有可能從怪取得
  if (sourceMonsters.length !== 0) {
    let monsters = sourceMonsters.map(monster => monster.name).slice(0, 20);
    response.push(`掉落來源：${monsters.join("、")}`);
  }

  if (item.randomAttributes.length > 0) {
    response.push("隨機屬性：");
    item.randomAttributes
      .filter(data => data.attribute !== "額外")
      .forEach(data => response.push(`\t${data.attribute}：${data.min}~${data.max}`));
  }

  Message.channel.send(
    `<@${author.id}> 您要查詢的是 ${item.name}\n\`\`\`${response.join("\n")}\`\`\``
  );
}
