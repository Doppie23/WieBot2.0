import { ComponentType, SlashCommandBuilder, userMention } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { Mines } from "./Mines";
import db from "../../../db/db";

export const data = new SlashCommandBuilder()
  .setName("mines")
  .setDescription("100% winrate")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Hoeveel punten wil je inzetten?")
      .setRequired(true)
      .setMinValue(1),
  )
  .addIntegerOption((option) =>
    option
      .setName("mines")
      .setDescription(
        "Met hoeveel mijnen wil je spelen? Meer mijnen == hogere payout.",
      )
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(15),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = interaction.options.getInteger("amount")!;
  const amountOfmines = interaction.options.getInteger("mines")!;

  const mines = new Mines(amountOfmines, amount, interaction.user.displayName);

  db.users.updateRngScore(interaction.user.id, interaction.guildId!, -amount);

  const response = await interaction.reply({
    embeds: [mines.createEmbed()],
    components: mines.rows,
  });

  while (!mines.isGameOver) {
    const i = await response.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      time: 180_000,
    });

    mines.handleClickInteraction(i);
    await interaction.editReply({
      embeds: [mines.createEmbed()],
      components: mines.rows,
    });
    i.deferUpdate();
  }

  if (mines.isSuccess) {
    const payout = mines.payout;
    interaction.followUp(
      `${userMention(interaction.user.id)} heeft ${payout} punten gewonnen!`,
    );
    db.users.updateRngScore(interaction.user.id, interaction.guildId!, payout);
  } else {
    interaction.followUp(
      `${userMention(interaction.user.id)} heeft ${amount} punten verloren!`,
    );
  }
}
