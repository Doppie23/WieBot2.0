import { SlashCommandBuilder } from "discord.js";
import { ChatInputCommandInteraction } from "discord.js";
import db from "../../../db/db";
import { Blackjack } from "./Blackjack";
import * as rng from "../../../helpers/RngHelper";
import { createEmbed, createRow } from "./components";

export const data = new SlashCommandBuilder()
  .setName("blackjack")
  .setDescription("Unlimited Money Glitch 100% WORKING!!1!")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Hoeveel punten wil je inzetten?")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  let amount = await rng.getBetAmount(interaction);
  if (amount === undefined) return;

  await rng.playRngGame(interaction, amount, async (increaseBetAmount) => {
    amount = amount!; // IDK why but typescript..., it should be fine because we check if amount is undefined above

    const canBetAmount = (amount: number) => {
      const user = db.users.getUser(interaction.user.id, interaction.guildId!);
      return user!.rngScore! >= amount;
    };

    const blackjack = new Blackjack(interaction.user.displayName, amount);

    let row = createRow(blackjack, canBetAmount(amount));

    const response = await interaction.reply({
      embeds: [createEmbed(blackjack)],
      components: !blackjack.isGameOver ? [row] : undefined,
    });

    while (!blackjack.isGameOver) {
      if (blackjack.isPlayerTurn) {
        const confirmation = await response.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: 180_000,
        });
        if (
          !(
            confirmation.customId === "hit" ||
            confirmation.customId === "stand" ||
            confirmation.customId === "doubleDown" ||
            confirmation.customId === "split"
          )
        ) {
          throw new Error("Invalid component");
        }

        switch (confirmation.customId) {
          case "hit":
            blackjack.hit();
            break;
          case "stand":
            blackjack.stand();
            break;
          case "doubleDown":
          case "split":
            if (!canBetAmount(amount)) {
              await confirmation.reply({
                content: "Sorry, daar heb je niet genoeg punten voor.",
                ephemeral: true,
              });
              continue;
            }
            increaseBetAmount(amount);
            if (confirmation.customId === "doubleDown") {
              blackjack.doubleDown();
            } else {
              blackjack.split();
            }
            break;
        }

        row = createRow(blackjack, canBetAmount(amount)); // update extra buttons, like double down and split

        await confirmation.deferUpdate();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        blackjack.dealerTurn();
      }

      await interaction.editReply({
        embeds: [createEmbed(blackjack)],
        components: blackjack.isPlayerTurn ? [row] : [],
      });
    }

    const { winnings } = blackjack.getWinnings();

    if (winnings > 0) {
      rng.updateScore(interaction.user.id, interaction.guildId!, winnings);
    }
  });
}
