import { EmbedBuilder } from "discord.js";
import random from "../../../utils/random";

const options = ["🚂", "🚿", "💡", "🛂", "🚗", "💍"];

type TrinnaResult = {
  amount: number;
  result: string[];
  trainCount: number;
  positive: boolean;
  winnings: number;
};

export function trinna(amount: number): TrinnaResult {
  const result = [];
  let trainCount = 0;
  for (let i = 0; i < 3; i++) {
    const element = random.choice(options);
    result.push(element);
    if (element === "🚂") {
      trainCount++;
    }
  }

  const positive = trainCount !== 0;

  return {
    amount,
    result,
    trainCount,
    positive,
    winnings: positive ? amount * trainCount * 2 - amount : 0,
  };
}

export function createEmbed(result: TrinnaResult, name: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("Lucky Dice")
    .setColor(result.positive ? "Green" : "Red")
    .setDescription(
      `${name} heeft ${
        result.positive ? result.winnings : result.amount
      } punten ${result.positive ? "gewonnen" : "verloren"}.`,
    );

  for (const element of result.result) {
    embed.addFields({
      name: "🎲",
      value: element,
      inline: true,
    });
  }

  return embed;
}
