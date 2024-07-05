import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import db from "../../../db/db";
import { getGuildMember } from "../../../utils/interaction";

export const data = new SlashCommandBuilder()
  .setName("outroleaderboard")
  .setDescription("@boodschapjes");

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) throw new Error("guildId is undefined");

  let i = 1;

  const embed = new EmbedBuilder()
    .setTitle("Vaakst het laatste de call verlaten")
    .setColor("Random");

  const fields = [];
  for (const user of db.users.getOutroScores(interaction.guild.id)) {
    const guildUser = await getGuildMember(interaction, user.id);

    if (!guildUser) continue;

    if (i == 1) {
      embed.setThumbnail(guildUser.displayAvatarURL());
    }

    fields.push({
      name: `${i++}: ${guildUser.displayName}`,
      value: `${user.outroScore.toString()} keer`,
      inline: false,
    });
  }
  embed.setFields(...fields);

  await interaction.reply({ embeds: [embed] });
}
