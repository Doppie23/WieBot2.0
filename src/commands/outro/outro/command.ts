import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import { EmbedBuilder, SlashCommandBuilder, userMention } from "discord.js";
import path from "node:path";
import fs from "node:fs";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import random from "../../../utils/random";
import db from "../../../db/db";
import { getScaleFactor } from "../../../utils/rngUtils";

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
    throw new Error(
      `User (${interaction.user.displayName}) picked choice should not be possible: ${choice?.name}`,
    );
  }

  const fileLocation = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "outro-songs",
    choice.filename,
  );

  if (!fs.existsSync(fileLocation)) {
    throw new Error(`File ${fileLocation} does not exist.`);
  }

  const guild = interaction.guild!;

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
    const usersNeeded = db.users.getAllRngUsers(interaction.guildId!);
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

  random.shuffle(members);

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

  player.on("stateChange", async (oldState, newState) => {
    if (
      newState.status === AudioPlayerStatus.Idle &&
      oldState.status === AudioPlayerStatus.Playing
    ) {
      await onStoppedPlaying();
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

  async function onStoppedPlaying() {
    connection.destroy();

    let lastLeft: GuildMember | undefined;
    const promises = members.map(async (member) => {
      await member.voice.disconnect();
      lastLeft = member;
    });

    await Promise.all(promises);

    if (!lastLeft) throw new Error("Could not find last left member");

    db.users.increaseOutroScore(lastLeft.id, lastLeft.guild.id);

    if (!choice) return;

    if (!choice.isRng) {
      await interaction.followUp(userMention(lastLeft.id));
    } else {
      if (!db.users.isRngUser(lastLeft.id, lastLeft.guild.id)) {
        await interaction.followUp(
          `${userMention(
            lastLeft.id,
          )} doet niet mee, niemand krijgt er dus punten bij.`,
        );
        return;
      }

      const score = getRngScore(interaction.guildId!);
      db.users.updateRngScore(lastLeft.id, lastLeft.guild.id, score);

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
}

function getRngScore(guildId: string) {
  const scaleFactor = getScaleFactor(guildId, 2);

  // hoofdprijs
  if (random.choices([true, false], [1, 20])) {
    return 1000 * scaleFactor;
  }

  const score = random.randrange(5, 100);
  const positive = random.choices([true, false], [9, 1]);
  return score * (positive ? 1 : -1) * scaleFactor;
}
