import { SlashCommandBuilder, userMention } from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import {
  decreaseRngScore,
  getAllRngUsers,
  increaseRngScore,
} from "../../db/rng";
import { getUser } from "../../db/utils";
import { User } from "../../db/db";
import random from "../../utils/random";

export const data = new SlashCommandBuilder()
  .setName("steel")
  .setDescription("steel punten van iemand anders")
  .addStringOption((option) =>
    option
      .setName("target")
      .setDescription("wie?")
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetId = interaction.options.getString("target");
  if (!targetId) throw new Error("targetId is undefined");

  const user = getUser(interaction.user.id, interaction.guildId!);
  const target = getUser(targetId, interaction.guildId!);

  if (!target || !user) throw new Error("user or target is undefined");

  if (user.rngScore === null) {
    await interaction.reply({
      content: "Je doet niet mee.",
      ephemeral: true,
    });
    return;
  }

  if (target.rngScore! <= 0) {
    await interaction.reply({
      content: "Je kan niet stelen van iemand met nul of minder punten.",
      ephemeral: true,
    });
    return;
  }

  const [success, dScore] = steel(user, target);

  if (success) {
    await interaction.reply(
      `${userMention(
        interaction.user.id,
      )} heeft zojuist ${dScore} punten gestolen van ${userMention(targetId)}.`,
    );
  } else {
    await interaction.reply(
      `${userMention(
        interaction.user.id,
      )} probeerde zojuist te stelen van ${userMention(
        targetId,
      )}, maar heeft gefaald. Nu moet hij een boete betalen van ${dScore} punten.`,
    );
  }
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  const users = getAllRngUsers(interaction.guildId!);

  const guildUsers: GuildMember[] = [];
  for (const user of users) {
    const guildUser = await interaction.guild!.members.fetch(user.id);
    if (!guildUser || guildUser.id === interaction.user.id) continue;
    guildUsers.push(guildUser);
  }

  const filtered = guildUsers.filter((user) =>
    user.displayName.startsWith(focusedValue),
  );
  await interaction.respond(
    filtered.map((choice) => ({ name: choice.displayName, value: choice.id })),
  );
}

function steel(user: User, target: User): [boolean, number] {
  let userScore = user.rngScore!;
  let targetScore = target.rngScore!;

  if (userScore < 0) {
    userScore = 0;
  }
  if (targetScore < 0) {
    targetScore = 0;
  }

  const winnerId = random.choices(
    [user.id, target.id],
    [targetScore, userScore],
  );

  let scoreFraction: number;
  if (userScore >= targetScore) scoreFraction = targetScore / userScore;
  else scoreFraction = userScore / targetScore;
  scoreFraction = 1 - scoreFraction;

  let addedScore = targetScore * scoreFraction;
  const percentage = random.randrange(5, 20) * 0.01;
  addedScore = Math.round(addedScore * percentage);

  const guildId = user.guildId;

  if (winnerId === user.id) {
    increaseRngScore(user.id, guildId, addedScore);
    decreaseRngScore(target.id, guildId, addedScore);
    return [true, addedScore];
  }
  const fine = addedScore * 2;
  decreaseRngScore(user.id, guildId, fine);
  return [false, fine];
}