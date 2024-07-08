import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import db from "../../../db/db";
import random from "../../../utils/random";
import {
  autocompleteRngUsers,
  getGuildMember,
} from "../../../utils/interaction";
import { DbUser } from "../../../db/tables/UsersTable";

export const timeout = 12 * 60 * 60; // 12 hours

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

  const user = db.users.getUser(interaction.user.id, interaction.guildId!);
  const target = db.users.getUser(targetId, interaction.guildId!);

  if (!target || !user) throw new Error("user or target is undefined");

  if (target.rngScore! <= 0) {
    await interaction.reply({
      content: "Je kan niet stelen van iemand met nul of minder punten.",
      ephemeral: true,
    });
    return;
  }

  const result = steel(user, target);

  await interaction.reply({
    embeds: [
      createEmbed(
        interaction.user.displayName,
        await getGuildMember(interaction, targetId),
        result,
      ),
    ],
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  await autocompleteRngUsers(interaction);
}

type SteelResult = { success: boolean; score: number };

function steel(user: DbUser, target: DbUser): SteelResult {
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
  if (userScore >= targetScore) {
    scoreFraction = targetScore / userScore;
  } else {
    scoreFraction = userScore / targetScore;
  }
  scoreFraction = 1 - scoreFraction;

  let addedScore = targetScore * scoreFraction;
  const percentage = random.randrange(5, 20) * 0.01;
  addedScore = Math.round(addedScore * percentage);

  const guildId = user.guildId;

  if (winnerId === user.id) {
    db.users.donate(target.id, user.id, guildId, addedScore);
    return { success: true, score: addedScore };
  }
  const fine = addedScore * 2;
  db.users.updateRngScore(user.id, guildId, -fine);
  return { success: false, score: fine };
}

function createEmbed(
  userName: string,
  target: GuildMember,
  result: SteelResult,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("Steel")
    .setThumbnail(target.user.displayAvatarURL());

  if (result.success) {
    return embed
      .setColor("Green")
      .setDescription(`${userName} heeft gestolen van ${target.displayName}.`)
      .addFields(
        {
          name: `🔪🩸 ${target.displayName}`,
          value: `-${result.score} punten`,
        },
        {
          name: `🏃‍♀️ ${userName}`,
          value: `+${result.score} punten`,
        },
      );
  } else {
    return embed
      .setColor("Red")
      .setDescription(
        `${userName} probeerde zojuist te stelen van ${target.displayName}. Maar, de wouten hadden hem in de smiezen. 🚔`,
      )
      .addFields({
        name: "💸 Boete",
        value: `${result.score} punten`,
      })
      .setFooter({
        text: `#free${userName}`,
      });
  }
}
