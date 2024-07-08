import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { Blackjack } from "./Blackjack";

export function createEmbed(blackjack: Blackjack): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("Blackjack")
    .setDescription(blackjack.statusMsg)
    .setColor(
      !blackjack.isGameOver
        ? "Grey"
        : blackjack.getWinnings().nettoWinnings > 0
        ? "Green"
        : "Red",
    );

  const fields: APIEmbedField[] = [];
  for (let i = 0; i < blackjack.playerHands.length; i++) {
    const hand = blackjack.playerHands[i]!;
    fields.push({
      name: `${
        blackjack.playerHandIndex === i && !blackjack.isGameOver ? "⏩ " : ""
      }${hand.name}'s hand (${hand.betAmount} punten)`,
      value:
        blackjack.playerHands[i]!.toString() +
        (blackjack.isGameOver ? ` (${hand.value})` : ""),
    });
  }

  const hideDealerHand = blackjack.isPlayerTurn && !blackjack.isGameOver;
  if (!hideDealerHand) {
    fields.push({
      name: `${
        !blackjack.isPlayerTurn && !blackjack.isGameOver ? "⏩ " : ""
      }Dealer hand`,
      value:
        blackjack.dealerHand.toString() +
        (blackjack.isGameOver ? ` (${blackjack.dealerHand.value})` : ""),
    });
  } else {
    fields.push({
      name: "Dealer hand",
      value: blackjack.dealerHand.cards[0].toString() + ", " + "⬛",
    });
  }

  embed.addFields(fields);

  return embed;
}

export function createRow(
  blackjack: Blackjack,
  hasEnoughPoints: boolean,
): ActionRowBuilder<ButtonBuilder> {
  const canDoubleDown =
    blackjack.isPlayerTurn &&
    blackjack.currentHand.canDoubleDown &&
    hasEnoughPoints;

  const canSplit =
    blackjack.isPlayerTurn && blackjack.currentHand.canSplit && hasEnoughPoints;

  const hit = new ButtonBuilder()
    .setCustomId("hit")
    .setLabel("Hit")
    .setStyle(ButtonStyle.Primary);

  const stand = new ButtonBuilder()
    .setCustomId("stand")
    .setLabel("Stand")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(hit, stand);

  if (canDoubleDown) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("doubleDown")
        .setLabel("Double Down")
        .setStyle(ButtonStyle.Danger),
    );
  }

  if (canSplit) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("split")
        .setLabel("Split")
        .setStyle(ButtonStyle.Danger),
    );
  }

  return row;
}
