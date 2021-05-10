const { Message } = require("discord.js");
const keywordModel = require("../models/KeywordModel");
const prefix = ".";

/**
 * 是否驅動關鍵字
 * @param {Message} Message
 */
exports.detectKeyword = async Message => {
  if (!Message.content.startsWith(prefix)) return false;
  const { content } = Message;

  let keywordData = await keywordModel.getKeywords();
  return keywordData.map(data => data.keyword).indexOf(content.slice(1)) !== -1;
};

/**
 * 發送訊息
 * @param {Message} Message
 */
exports.handleSend = async Message => {
  let keyword = Message.content.slice(1);
  let data = await keywordModel.getKeywords();

  return Message.channel.send(data.find(d => d.keyword === keyword).reply);
};
