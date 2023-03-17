import dotenv from "dotenv";
import fs from "node:fs";
import client from "./src/app";
import path from "path";

if (fs.existsSync(".env")) {
  dotenv.config();
}

// Load all commands
(async () => {
  await registerCommands();
  await registerEvents();
})();

async function registerCommands() {
  const filepath = fs.readdirSync(path.join(__dirname, "src", "commands"));
  for (const file of filepath) {
    const cmd = require(`./src/commands/${file}`).default;

    if ("data" in cmd && "execute" in cmd) {
      client.commands.set(cmd.data.name, cmd);
    } else {
      console.warn(
        `The command at ${file} is not a valid command. Skipping...`
      );
    }
  }
}

async function registerEvents() {
  const eventsPath = path.join(__dirname, "src", "events");
  const eventFiles = fs.readdirSync(eventsPath);

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath).default;

    if (event.once) {
      client.once(event.name, (...args) =>
        event.execute(client.database, ...args)
      );
    } else {
      client.on(event.name, (...args) =>
        event.execute(client.database, ...args)
      );
    }
  }
}

client.login(process.env.DISCORD_APP_TOKEN);
