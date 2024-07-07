import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import db from "../../../db/db";
import { createEmbed, trinna } from "./trinna";
import { getBetAmount } from "../../../utils/rngUtils";

export const data = new SlashCommandBuilder()
  .setName("trinna")
  .setDescription("trinna is altijd goed")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Hoeveel punten wil je inzetten?")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = await getBetAmount(interaction);
  if (amount === undefined) return;

  const result = trinna(amount);

  db.users.updateRngScore(
    interaction.user.id,
    interaction.guildId!,
    result.positive ? result.winnings : -amount,
  );

  await interaction.reply({
    embeds: [createEmbed(result, interaction.user.displayName)],
  });
}
