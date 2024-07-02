import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import { EmbedBuilder, SlashCommandBuilder, userMention } from "discord.js";
import path from "node:path";
import fs from "node:fs";

import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { increaseOutroScore } from "../../db/outro";
import { getAllRngUsers, increaseRngScore, isRngUser } from "../../db/rng";
import random from "../../utils/random";

const choices = [
  {
    name: "Crab Rave",
    value: "crabrave",
    filename: "crab-rave.mp3",
    message: ":crab:",
  },
  {
    name: "Epic Outro",
    value: "epicoutro",
    filename: "epic-outro.mp3",
    message: "SMASH THAT LIKE BUTTON :thumbsup:",
    reactions: ["👍", "👎"],
  },
  {
    name: "Royalistiq",
    value: "royalistiq",
    filename: "royalistiq.mp3",
    message: "HOOWWH MY DAYS 😱",
  },
  {
    name: "RNG certified",
    value: "rngcertified",
    filename: "royalistiq.mp3",
    message: "RNG Certified 🍀",
    isRng: true,
  },
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

export async function execute(interaction: ChatInputCommandInteraction) {
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
    choice.filename,
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

  if (choice.isRng) {
    let allUsersInCall = true;
    const usersNeeded = getAllRngUsers(interaction.guildId!);
    for (const user of usersNeeded) {
      if (!members.some((member) => user.id === member.id)) {
        allUsersInCall = false;
        break;
      }
    }

    if (!allUsersInCall) {
      await interaction.reply({
        content:
          "Niet iedereen die meedoet zit in call, dus deze outro kan niet.",
        ephemeral: true,
      });
      return;
    }
  }

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
    throw new Error(`Something went wrong with the outro: ${error}`);
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

      increaseOutroScore(lastLeft.id, lastLeft.guild.id);
      if (!choice.isRng) {
        await interaction.followUp(userMention(lastLeft.id));
      } else {
        if (!isRngUser(lastLeft.id, lastLeft.guild.id)) {
          await interaction.followUp(
            `${userMention(
              lastLeft.id,
            )} doet niet mee, niemand krijgt er dus punten bij.`,
          );
          return;
        }

        const score = getRngScore();
        increaseRngScore(lastLeft.id, lastLeft.guild.id, score);

        const embed = new EmbedBuilder()
          .setTitle("Outro")
          .setColor("Random")
          .setThumbnail(lastLeft.displayAvatarURL())
          .addFields([
            { name: "Winnaar:", value: lastLeft.displayName },
            { name: "Punten:", value: score.toString() },
          ]);

        await interaction.followUp({ embeds: [embed] });
      }
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

function getRngScore() {
  // hoofdprijs
  if (random.choices([true, false], [1, 20])) {
    return 1000;
  }

  const score = random.randrange(1, 100);
  const positive = random.choices([true, false], [9, 1]);
  return score * (positive ? 1 : -1);
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
