import { ComponentType, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { Mines } from "./Mines";
import * as rng from "../../../helpers/RngHelper";

const squaresX = 5;
const squaresY = 4;

const minMines = 1;
const maxMines = squaresX * squaresY - 1;

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
        `(MIN: ${minMines}, MAX: ${maxMines}) Meer mijnen == hogere payout.`,
      )
      .setRequired(true)
      .setMinValue(minMines)
      .setMaxValue(maxMines),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = await rng.getBetAmount(interaction);
  if (amount === undefined) return;

  const amountOfmines = interaction.options.getInteger("mines")!;

  const mines = new Mines(amountOfmines, amount, interaction.user.displayName, {
    squaresX,
    squaresY,
  });

  await rng.playRngGame(interaction, amount, async () => {
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
      await i.deferUpdate();
    }

    if (mines.isSuccess) {
      rng.updateScore(interaction.user.id, interaction.guildId!, mines.payout);
    }
  });
}
