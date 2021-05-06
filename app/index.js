"use strict";
const isDEV = process.env.NODE_ENV !== "production";

if (isDEV) {
  require("dotenv").config();
}

const MessageHandle = require("./src/MessageHandle");
const ReactHandle = require("./src/ReactHandle");

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", () => {
  const embed = new Discord.MessageEmbed();

  embed
    .setTitle("小幫手啟動")
    .setColor("#AB1234")
    .setDescription("開始服務！")
    .setFooter(new Date().toLocaleTimeString());

  if (!isDEV) {
    client.channels.fetch("839773570359099434").then(channel => channel.send(embed));
  } else {
    console.log("小幫手啟動囉！");
  }
});

client.on("message", MessageHandle);

client.on("messageReactionAdd", ReactHandle);

client.login(process.env.DISCORD_APP_TOKEN);
