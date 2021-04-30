const { Message } = require("discord.js");
const EquipController = require("./controllers/EquipController");
const QuestController = require("./controllers/QuestController");

const router = [
  text(/^(坐|座)騎?\s(?<equip>\S+)$/, EquipController.FindDriver),
  text(/^背(部|飾)?\s(?<equip>\S+)$/, EquipController.FindBack),
  text(
    /^160\s(?<sum>(15|12))\s(?<room1>.)(?<number1>[1-9])\s(?<room2>.)(?<number2>[1-9])$/,
    QuestController.ForestMatrix
  ),
  text(/^175\s(?<number>\d{1,3})$/, QuestController.SevenStar),
  text(/^180\s(?<sum>\d{2})\s(?<leak>\d{1})/, QuestController.GodQuest),
];

/**
 * 文字事件處理
 * @param {Message} Message
 */
module.exports = async Message => {
  if (Message.author.bot) return;
  let target = undefined;

  for (let i = 0; i < router.length; i++) {
    let route = router[i];
    let result = route(Message);

    if (result.predicate) {
      target = result;
      break;
    }
  }

  if (!target) return;

  Message.channel.startTyping(1);
  await target.action(Message, { ...target.predicate });
  Message.channel.stopTyping(true);
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
