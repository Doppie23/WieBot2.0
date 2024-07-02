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
import interactionHandler from "./interaction-handler";

export type Client = _Client & {
  commands: Collection<string, Command>;
};

const client = new _Client({
  presence: { activities: [{ name: "You", type: ActivityType.Watching }] },
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
}) as Client;

client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

const setCommand = (
  fileName: string,
  command: any,
  isRngCommand: boolean,
): boolean => {
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, { ...command, isRngCommand });
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

    const isRngCommand = commandsPath.includes("rng");

    const success = setCommand(file, command, isRngCommand);
    if (!success) continue;

    fs.watch(filePath, () => {
      console.log(`[INFO] ${file} changed, reloading...`);

      delete require.cache[require.resolve(filePath)];
      const newCommand = require(filePath);

      client.commands.delete(command.data.name);
      if (setCommand(file, newCommand, isRngCommand)) {
        console.log(`[INFO] ${file} reloaded successfully!`);
      }
    });
  }
}

client.on(Events.InteractionCreate, (interaction) => {
  interactionHandler(client, interaction);
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[INFO] Ready! Logged in as ${readyClient.user.username}`);
});

console.log(`[INFO] Using database ${db.name}`);

client.login(token);
