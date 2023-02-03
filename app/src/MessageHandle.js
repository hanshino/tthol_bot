const { Message } = require("discord.js");
const EquipController = require("./controllers/EquipController");
const KeywordController = require("./controllers/KeywordController");
const QuestController = require("./controllers/QuestController");
const ItemController = require("./controllers/ItemController");
const MonsterController = require("./controllers/MonsterController");
const SkillController = require("./controllers/SkillController");
const memory = require("memory-cache");

const router = [
  text(
    /^[坐座]騎?(\s(\d{0,4})?(等級?|體力?|真氣?|外功?|根骨?|身法?|技巧?|內力|玄學?|物攻?|內勁|命中?|閃躲?|重擊?|防禦?|護勁?|移動速度)(\d{0,4})?)+$/,
    EquipController.filterDriver
  ),
  text(
    /^背[部飾]?(\s(\d{0,4})?(等級?|體力?|真氣?|外功?|根骨?|身法?|技巧?|內力|玄學?|物攻?|內勁|命中?|閃躲?|重擊?|防禦?|護勁?)(\d{0,4})?)+$/,
    EquipController.filterBack
  ),
  text(/^左(飾)?\s(?<equip>\S+)$/, EquipController.FindLeft),
  text(/^(帽|頭)(飾|部)?\s(?<equip>\S+)$/, EquipController.FindHat),
  text(/^右(飾)?\s(?<equip>\S+)$/, EquipController.FindRight),
  text(/^中(飾)?\s(?<equip>\S+)$/, EquipController.FindMid),
  text(/^[坐座]騎?\s(?<equip>\S+)$/, EquipController.FindDriver),
  text(/^背[部飾]?\s(?<equip>\S+)$/, EquipController.FindBack),
  text(
    /^160\s(?<sum>(15|12))\s(?<room1>.)(?<number1>[1-9])\s(?<room2>.)(?<number2>[1-9])$/,
    QuestController.ForestMatrix
  ),
  text(/^175\s(?<number>\d{1,3})$/, QuestController.SevenStar),
  text(/^180\s(?<sum>\d{2})\s(?<leak>\d{1})/, QuestController.GodQuest),
  route(Message => KeywordController.detectKeyword(Message), KeywordController.handleSend),
  text(/^.(物品|item)\s(?<item>\S+)$/, ItemController.showItem),
  text(/^.(怪物|monster|npc)\s(?<monster>\S+)$/, MonsterController.showMonster),
  text(/^.(技能|skill)\s(?<skill>\S+)(\s(?<level>\d{1,2}))?$/, SkillController.search),
  text("/refresh", Message => {
    memory.clear();
    Message.channel.send(`<@${Message.author.id}> 資料已刷新！`);
  }),
];

/**
 * 文字事件處理
 * @param {Message} Message
 */
module.exports = async Message => {
  try {
    if (Message.author.bot) return;
    let target = undefined;

    for (let i = 0; i < router.length; i++) {
      let currRoute = router[i];
      let result = await currRoute(Message);

      if (result.predicate) {
        target = result;
        break;
      }
    }

    const { username } = Message.author;
    console.log(username, Message.content);

    if (!target) return;

    await target.action(Message, { ...target.predicate });
  } catch (e) {
    console.error(e);
  }
};

/**
 * 文字路由
 * @param {String|RegExp} pattern
 * @param {Function} action
 * @returns {Function}
 */
function text(pattern, action) {
  return function (Message) {
    if (typeof pattern === "string") {
      if (pattern === "*") {
        return {
          predicate: true,
          action,
        };
      }

      return {
        predicate: Message.content === pattern,
        action,
      };
    }

    if (Array.isArray(pattern)) {
      return {
        predicate: pattern.indexOf(Message.content),
        action,
      };
    }

    if (pattern instanceof RegExp) {
      return {
        predicate: pattern.exec(Message.content),
        action,
      };
    }

    return {
      predicate: false,
      aciton,
    };
  };
}

/**
 * @param {Function} pattern
 * @param {Function} action
 */
function route(pattern, action) {
  return async function (Message) {
    return {
      predicate: await pattern(Message),
      action,
    };
  };
}
