const { MessageReaction, User } = require("discord.js");
const EquipController = require("./controllers/EquipController");

const router = [emoji("⏪", EquipController.ShowPre), emoji("⏩", EquipController.ShowNext)];

/**
 * @param {MessageReaction} MessageReaction
 * @param {User} User
 */
module.exports = async (MessageReaction, User) => {
  if (MessageReaction.me) return;
  MessageReaction.author = User;
  let { channel } = MessageReaction.message;

  let target = undefined;

  for (let i = 0; i < router.length; i++) {
    let route = router[i];
    let result = route(MessageReaction);

    if (result.predicate) {
      target = result;
      break;
    }
  }

  if (!target) return;

  channel.startTyping(1);
  await target.action(MessageReaction, { ...target.predicate });
};

function emoji(pattern, action) {
  return function (MessageReaction) {
    return {
      predicate: MessageReaction.emoji.name === pattern,
      action,
    };
  };
}
