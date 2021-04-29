"use strict";
require("dotenv").config();
const MessageHandle = require("./src/MessageHandle");
const ReactHandle = require("./src/ReactHandle");

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", MessageHandle);

client.on("messageReactionAdd", ReactHandle);

client.login(process.env.DISCORD_APP_TOKEN);
