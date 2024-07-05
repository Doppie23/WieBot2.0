// https://discordjs.guide/creating-your-bot/command-deployment.html#guild-commands

import { REST, Routes } from "discord.js";
import { clientId, guildId, token } from "../config.json";
import path from "node:path";
import { recFindFiles } from "./utils/interaction";

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, "commands");

const commandFiles = recFindFiles("command.js", foldersPath);

for (const file of commandFiles) {
  const filePath = file.path;
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log(
      // @ts-ignore
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
