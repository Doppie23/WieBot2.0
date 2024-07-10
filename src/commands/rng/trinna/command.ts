import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { createEmbed, trinna } from "./trinna";
import * as rng from "../../../helpers/RngHelper";

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
  const amount = await rng.getBetAmount(interaction);
  if (amount === undefined) return;

  const result = trinna(amount);

  rng.updateScore(
    interaction.user.id,
    interaction.guildId!,
    result.positive ? result.winnings : -amount,
  );

  await interaction.reply({
    embeds: [createEmbed(result, interaction.user.displayName)],
  });
}
