import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import { SlashCommandBuilder, userMention } from "discord.js";
import path from "node:path";
import fs from "node:fs";

import type { CommandInteraction, GuildMember } from "discord.js";
import { increaseOutroScore } from "../../db/outro";

const choices = [
  { name: "Crab Rave", value: "crab-rave.mp3", message: ":crab:" },
  {
    name: "Epic Outro",
    value: "epic-outro.mp3",
    message: "SMASH THAT LIKE BUTTON :thumbsup:",
    reactions: ["👍", "👎"],
  },
  { name: "Royalistiq", value: "royalistiq.mp3", message: "HOOWWH MY DAYS 😱" },
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
  const value = interaction.options.get("choices")?.value;

  const choice = choices.find((e) => e.value === value);

  if (!(choice && typeof value === "string")) {
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
    choice.value,
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

      let lastLeft: GuildMember | undefined;
      const promises = members.map(async (member) => {
        await member.voice.disconnect();
        lastLeft = member;
      });

      await Promise.all(promises); // Wait for all kicks to finish

      if (!lastLeft) throw new Error("Could not find last left member");
      await interaction.followUp(userMention(lastLeft.id));
      increaseOutroScore(lastLeft.id, lastLeft.guild.id);
    }
  });

  const response = await interaction.reply({
    content: choice.message,
    fetchReply: true,
  });
  if (choice.reactions) {
    for (const reaction of choice.reactions) {
      await response.react(reaction);
    }
  }
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
