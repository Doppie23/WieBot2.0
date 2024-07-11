import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import rng from "../../../helpers/RngHelper";
import { LuckyWheel } from "./Luckywheel";
import { createEmbed } from "./createEmbed";

export const timeout = 12 * 60 * 60; // 12 hours

export const data = new SlashCommandBuilder()
  .setName("luckywheel")
  .setDescription("Altijd prijs!!!");

export async function execute(interaction: ChatInputCommandInteraction) {
  const luckyWheel = new LuckyWheel(interaction.guildId!);

  await interaction.reply({ embeds: [createEmbed(luckyWheel)] });
  let sleepTime = 0.1;
  for (let i = 0; i < 12; i++) {
    await new Promise((resolve) => setTimeout(resolve, sleepTime * 1000));
    luckyWheel.rollOneStep();
    await interaction.editReply({ embeds: [createEmbed(luckyWheel)] });
    sleepTime += 0.05;
  }

  await new Promise((resolve) => setTimeout(resolve, sleepTime * 1000));

  const score = luckyWheel.currentOptions[1]!;

  rng.updateScore(interaction.user.id, interaction.guildId!, score);

  await interaction.followUp(`Je hebt ${score} punten gewonnen.`);
}
