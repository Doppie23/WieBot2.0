import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import db from "../../../db/db";
import random from "../../../utils/random";
import { createEmbed, trinna } from "./trinna";

export const data = new SlashCommandBuilder()
  .setName("trinna")
  .setDescription("trinna is altijd goed")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("hoeveel?")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = interaction.options.getInteger("amount")!;

  const user = db.users.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < amount) {
    await interaction.reply({
      content: "Je hebt te weinig punten!",
      ephemeral: true,
    });
    return;
  }

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
