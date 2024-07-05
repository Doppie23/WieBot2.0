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
import random from "./utils/random";
import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import hmr from "node-hmr";

export type Client = _Client & {
  commands: Collection<string, Command>;
};

export const isProduction = process.env.NODE_ENV === "production";

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

    if (isProduction) continue;

    hmr(async () => {
      delete require.cache[require.resolve(filePath)];
      const newCommand = require(filePath);
      client.commands.delete(command.data.name);
      setCommand(file, newCommand, isRngCommand);
    });
  }
}

client.on(Events.InteractionCreate, (interaction) => {
  interactionHandler(client, interaction);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (
    newState.channel === null ||
    oldState.channel === newState.channel ||
    !isProduction
  )
    return;

  try {
    const dir = "join-sounds";
    const fileLocation = await new Promise<string>((resolve, reject) => {
      if (!fs.existsSync(dir)) {
        return reject(new Error(`Directory ${dir} does not exist`));
      }

      fs.readdir(dir, (e, files) => {
        if (e) return reject(e);

        const file = random.choice(files);
        resolve(path.join(dir, file));
      });
    });

    const voiceChannel = newState.channel;
    const guild = voiceChannel.guild;

    const resource = createAudioResource(fileLocation);
    const player = createAudioPlayer();

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    player.play(resource);
    connection.subscribe(player);

    player.on("error", (error) => {
      throw new Error(`Something went wrong with the outro: ${error}`);
    });

    player.on("stateChange", async (oldState, newState) => {
      if (newState.status === "idle" && oldState.status === "playing") {
        connection.destroy();
      }
    });
  } catch (error) {
    console.error(`[ERROR] Error with join sound: ${error}`);
  }
});

process.on("uncaughtException", (e) => {
  console.log("[ERROR] Uncaught exception ", e);
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[INFO] Ready! Logged in as ${readyClient.user.username}`);
});

console.log(`[INFO] Using database ${db.connection.name}`);

client.login(token);
