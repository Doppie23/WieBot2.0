import type { ChatInputCommandInteraction } from "discord.js";
import { createEmbed, trinna } from "./trinna";
import rng from "../../../helpers/RngHelper";

export const data = new rng.SlashCommandBuilder()
  .setName("trinna")
  .setDescription("trinna is altijd goed")
  .addBetAmountOption();

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = await rng.SlashCommandBuilder.getBetAmount(interaction);
  if (amount === undefined) return;

  const result = trinna(amount);

  rng.playInstantRngGame(
    interaction.user.id,
    interaction.guildId!,
    result.positive ? result.winnings : -amount,
    interaction,
  );

  await interaction.reply({
    embeds: [createEmbed(result, interaction.user.displayName)],
  });
}
