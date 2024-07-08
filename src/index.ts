import fs from "node:fs";
import path from "node:path";
import {
  ActivityType,
  Client as _Client,
  Collection,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";
import { token } from "../config.json";
import db from "./db/db";
import type { Command } from "./types/Command";
import interactionHandler from "./interaction-handler";
import random from "./utils/random";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import hmr from "node-hmr";
import { recFindFiles } from "./utils/interaction";

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

const setCommand = (
  fileName: string,
  command: unknown,
  isRngCommand: boolean,
): boolean => {
  if (
    command &&
    typeof command === "object" &&
    "data" in command &&
    "execute" in command &&
    typeof (command as Command).execute === "function" &&
    typeof (command as Command).data === "object" &&
    (command as Command).data instanceof SlashCommandBuilder
  ) {
    client.commands.set((command as Command).data.name, {
      ...(command as Command),
      isRngCommand,
    });
    return true;
  }

  console.warn(
    `[WARNING] The command at ${fileName} is missing a required "data" or "execute" property.`,
  );
  return false;
};

const commandFiles = recFindFiles("command.js", foldersPath);

for (const file of commandFiles) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const command = require(file.path);

  const isRngCommand = file.path.includes("rng");

  const success = setCommand(file.name, command, isRngCommand);
  if (!success) continue;

  if (isProduction) continue;

  hmr(() => {
    delete require.cache[require.resolve(file.path)];
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const newCommand = require(file.path);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    client.commands.delete(command.data.name);
    setCommand(file.name, newCommand, isRngCommand);
  });
}

client.on(Events.InteractionCreate, async (interaction) => {
  await interactionHandler(client, interaction);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (
    newState.channel === null ||
    oldState.channel === newState.channel ||
    !isProduction ||
    newState.client.user.id === client.user?.id
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
      throw new Error("Something went wrong with the outro:", error);
    });

    player.on("stateChange", (oldState, newState) => {
      if (
        newState.status === AudioPlayerStatus.Idle &&
        oldState.status === AudioPlayerStatus.Playing
      ) {
        connection.destroy();
      }
    });
  } catch (error) {
    console.error("[ERROR] Error with join sound:", error);
  }
});

process.on("uncaughtException", (e) => {
  console.log("[ERROR] Uncaught exception ", e);
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[INFO] Ready! Logged in as ${readyClient.user.username}`);
});

console.log(`[INFO] Using database ${db.connection.name}`);

client.login(token).catch((error) => {
  console.error("[ERROR] Error starting client:", error);
});
