import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";
import { getOutroScores } from "../../db/outro";

export const data = new SlashCommandBuilder()
  .setName("outroleaderboard")
  .setDescription("@boodschapjes");

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) throw new Error("guildId is undefined");

  let i = 1;

  const embed = new EmbedBuilder()
    .setTitle("Vaakst het laatste de call verlaten")
    .setColor("Random");

  for (const user of getOutroScores(interaction.guild.id)) {
    const guildUser = interaction.guild!.members.cache.get(user.id);

    if (!guildUser) continue;

    if (i == 1) {
      embed.setThumbnail(guildUser.displayAvatarURL());
    }

    embed.setFields({
      name: `${i++}: ${guildUser.displayName}`,
      value: `${user.outroScore.toString()} keer`,
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}
