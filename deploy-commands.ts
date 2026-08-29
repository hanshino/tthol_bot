import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "path";

if (fs.existsSync(".env")) {
  dotenv.config({ quiet: true });
}

const commands = [];

const commandsPath = path.join(__dirname, "src", "commands");
const commandFiles = fs.readdirSync(commandsPath);

for (const file of commandFiles) {
  const command = require(`./src/commands/${file}`).default;
  commands.push(command.data.toJSON());
}

const token = process.env.DISCORD_APP_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token) {
  console.error("No token provided. Exiting...");
  process.exit(1);
}

if (!clientId) {
  console.error("No client ID provided. Exiting...");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    // ponytail: this PUT already overwrites the whole global command list —
    // anything not in the body is removed. Sending `body: []` first only
    // deleted every command so the second call had to recreate them all with
    // fresh IDs, which invalidates every client's cached command and shows
    // "Unknown Integration" until each user reloads. One call keeps IDs stable.
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
