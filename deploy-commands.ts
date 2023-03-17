import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "path";

if (fs.existsSync(".env")) {
  dotenv.config();
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

    console.log("Deleting old commands...");
    await rest.put(Routes.applicationCommands(clientId), {
      body: [],
    });

    console.log("Registering new commands...");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
