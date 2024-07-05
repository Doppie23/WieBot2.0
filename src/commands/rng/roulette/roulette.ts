import { EmbedBuilder } from "discord.js";
import random from "../../../utils/random";

// prettier-ignore
const outcomes = ["0", "00", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36"]
// prettier-ignore
const odds = [1, 1, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35]

export type RouletteOptions =
  | {
      amount: number;
      type: "even" | "odd";
    }
  | {
      amount: number;
      type: "number";
      number: string;
    };

export type RouletteOutcome = {
  success: boolean;
  winnings: number;
  outcome: string;
};

export function spinRoulette(options: RouletteOptions): RouletteOutcome {
  const outcome = random.choices(outcomes, odds);

  switch (options.type) {
    case "number":
      if (options.number === outcome) {
        const winnings = options.amount * 35;
        return { success: true, winnings: winnings, outcome: outcome };
      }
      break;
    case "even":
      if (parseInt(outcome) % 2 === 0) {
        const winnings = options.amount;
        return { success: true, winnings: winnings, outcome: outcome };
      }
      break;
    case "odd":
      if (parseInt(outcome) % 2 !== 0) {
        const winnings = options.amount;
        return { success: true, winnings: winnings, outcome: outcome };
      }
      break;
  }

  return { success: false, winnings: 0, outcome: outcome };
}

export function createEmbed(
  options: RouletteOptions,
  outcome: RouletteOutcome,
  name: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("Roulette")
    .setColor(outcome.success ? "Green" : "Red")
    .setDescription(
      `${name} heeft ${options.amount} punten ingezet op ${
        options.type === "number" ? "nummer" + options.number : options.type
      }`,
    )
    .addFields({
      name: `🎲 De uitkomst was ${outcome.outcome}`,
      value: `Je hebt ${outcome.winnings} punten gewonnen.`,
    });
}
