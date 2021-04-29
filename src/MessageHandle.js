const { Message } = require("discord.js");
const EquipController = require("./controllers/EquipController");

const router = [text(/^坐騎\s(?<equip>\S+)$/, EquipController.FindDriver)];

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
