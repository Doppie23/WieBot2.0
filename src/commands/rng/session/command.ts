import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import db from "../../../db/db";
import {
  autocompleteRngUsers,
  getGuildMember,
} from "../../../utils/interaction";

export const data = new SlashCommandBuilder()
  .setName("session")
  .setDescription("Zie het verschil in aantal punten na de laatste sessie.")
  .addStringOption((option) =>
    option.setName("target").setDescription("wie?").setAutocomplete(true),
  );
export async function execute(interaction: ChatInputCommandInteraction) {
  let targetId = interaction.options.getString("target");
  if (!targetId) {
    targetId = interaction.user.id;
  }

  const user = await getGuildMember(interaction, targetId);

  let result;
  try {
    result = db.rngSessions.getLatestSession(user.id, interaction.guildId!);
  } catch (e) {
    await interaction.reply({
      content: "Er is nog geen sessie data beschikbaar voor deze gebruiker.",
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Sessie")
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      `${user.displayName} heeft sinds ${result.startDate.toLocaleString(
        "nl",
      )} **${result.amount.toString()} punten** verdiend.`,
    )
    .setColor(
      result.amount === 0 ? "Grey" : result.amount < 0 ? "Red" : "Green",
    )
    .setFields({
      name: "Laatste activiteit",
      value: result.lastUpdateDate.toLocaleString("nl"),
    })
    .setFooter({
      text: "Na 30 minuten inactiviteit wordt een nieuwe sessie gestart.",
      iconURL:
        "https://wikis.tid.es/gvp-public/images/9/9f/Infobox_info_icon_white.svg.png",
    });
  await interaction.reply({ embeds: [embed] });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  await autocompleteRngUsers(interaction);
}
