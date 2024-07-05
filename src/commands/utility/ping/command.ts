import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply("Pong! test");
  console.log(`Ponged: ${interaction.user.displayName}`);
}
