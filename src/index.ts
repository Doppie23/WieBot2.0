import fs from "node:fs";
import path from "node:path";
import {
  ActivityType,
  Client as _Client,
  Collection,
  Events,
  GatewayIntentBits,
} from "discord.js";
import { token } from "../config.json";
import db from "./db/db";

import type { Command } from "./types/Command";

type Client = _Client & {
  commands: Collection<string, Command>;
};

const client = new _Client({
  presence: { activities: [{ name: "You", type: ActivityType.Watching }] },
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
}) as Client;

client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

const setCommand = (fileName: string, command: any): boolean => {
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    return true;
  }

  console.warn(
    `[WARNING] The command at ${fileName} is missing a required "data" or "execute" property.`,
  );
  return false;
};

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    const success = setCommand(file, command);
    if (!success) continue;

    fs.watch(filePath, () => {
      console.log(`[INFO] ${file} changed, reloading...`);

      delete require.cache[require.resolve(filePath)];
      const newCommand = require(filePath);

      client.commands.delete(command.data.name);
      if (setCommand(file, newCommand))
        console.log(`[INFO] ${file} reloaded successfully!`);
    });
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.guildId === undefined) {
      interaction.reply("Interactions are only available in guilds");
      return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("[ERROR] " + error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  } else if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      if (!command.autocomplete)
        throw new Error("autocomplete is not defined in " + command.data.name);

      await command.autocomplete(interaction);
    } catch (error) {
      console.error(error);
    }
  }
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.username}`);
});

console.log(db.name);

client.login(token);
