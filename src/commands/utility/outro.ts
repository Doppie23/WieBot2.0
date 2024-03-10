import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import { SlashCommandBuilder } from "discord.js";
import path from "node:path";
import fs from "node:fs";

import type { CommandInteraction, GuildMember } from "discord.js";

const choices = [
  { name: "Crab Rave", value: "crab-rave.mp3" },
  { name: "Epic Outro", value: "epic-outro.mp3" },
  { name: "Royalistiq", value: "royalistiq.mp3" },
];

export const data = new SlashCommandBuilder()
  .setName("outro")
  .setDescription("Epic outro")
  .addStringOption((option) =>
    option
      .setName("choices")
      .setDescription("test")
      .setRequired(true)
      .addChoices(...choices),
  );

export async function execute(interaction: CommandInteraction) {
  const choice = interaction.options.get("choices")?.value;

  if (
    !(choices.some((e) => e.value === choice) && typeof choice === "string")
  ) {
    console.warn(
      `[WARN] User (${interaction.user.displayName}) picked choice should not be possible: ${choice} from ${choices}`,
    );
    await interaction.reply({
      content: "You did something that should not be possible :'(",
      ephemeral: true,
    });
    return;
  }

  const fileLocation = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "outro-songs",
    choice,
  );

  if (!fs.existsSync(fileLocation)) {
    throw new Error(`[ERROR] File ${fileLocation} does not exist.`);
  }

  const guild = interaction.guild;
  if (!guild?.id) throw new Error("guildId is undefined");

  const voiceChannel = (interaction.member as GuildMember).voice.channel;
  if (!voiceChannel || !voiceChannel.id) {
    await interaction.reply({
      content: "You are not in a voice channel",
      ephemeral: true,
    });
    return;
  }

  const members = voiceChannel.members.map((e) => e);
  shuffleArray(members);

  const resource = createAudioResource(fileLocation);
  const player = createAudioPlayer();

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  player.play(resource);
  connection.subscribe(player);

  console.log(`[INFO] Now playing ${fileLocation}`);

  player.on("error", (error) => {
    console.error(`[ERROR] Something went wrong with the outro: ${error}`);
  });

  player.on("stateChange", async (oldState, newState) => {
    if (newState.status === "idle" && oldState.status === "playing") {
      connection.destroy();

      const promises = members.map(async (member) => {
        console.log(`Kicking: ${member.displayName} | ${Date.now()}`);
        await member.voice.disconnect();
        console.log(`Kicked: ${member.displayName} | ${Date.now()}`);
      });

      await Promise.all(promises); // Wait for all kicks to finish
    }
  });

  await interaction.reply("Joined channel");
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
