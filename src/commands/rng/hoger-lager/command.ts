import { ChatInputCommandInteraction, ComponentType } from "discord.js";
import rng from "../../../helpers/RngHelper";
import { HigherLower } from "./HigherLower";

export const data = new rng.SlashCommandBuilder()
  .setName("hoger-lager")
  .setDescription("epic description")
  .addBetAmountOption();

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = await rng.SlashCommandBuilder.getBetAmount(interaction);
  if (amount === undefined) return;

  await rng.playRngGame(interaction, amount, async () => {
    const game = new HigherLower(amount, interaction.user.displayName);

    let response = await interaction.reply({
      embeds: [game.embed],
      components: game.components,
      fetchReply: true,
    });

    while (game.playerWon === undefined) {
      const confirmation = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 180_000,
      });
      if (
        confirmation.customId !== "cashout" &&
        confirmation.customId !== "higher" &&
        confirmation.customId !== "lower"
      ) {
        throw new Error("Invalid component");
      }

      game.tick(confirmation.customId);

      await confirmation.deferUpdate();

      response = await interaction.editReply({
        embeds: [game.embed],
        components: game.components,
      });
    }

    if (game.playerWon === true) {
      rng.updateScore(interaction.user.id, interaction.guildId!, game.winnings);
    }

    await interaction.editReply({
      embeds: [game.embed],
      components: [],
    });
  });
}
