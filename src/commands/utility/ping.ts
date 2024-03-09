import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!");

export async function execute(interaction: CommandInteraction) {
  await interaction.reply("Pong!");
  console.log(`Ponged: ${interaction.user.displayName}`);
}
