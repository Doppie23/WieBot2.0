import { EmbedBuilder } from "discord.js";
import random from "../../../utils/random";
import { Bet } from "./command";

type RouletteOutcome = {
  success: boolean;
  winnings: number;
  outcome: number;
  results: resultBet[];
};

type resultBet = {
  success: boolean;
  winnings: number;
} & Bet;

const outcomes = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
];

// https://nl.wikipedia.org/wiki/Roulette_(spel)#Wijze_van_inzetten
const amountOfPocketsToWinnings = new Map([
  [1, 35],
  [2, 17],
  [4, 8],
  [12, 2],
  [12, 2],
  [18, 1],
]);

export function spinRoulette(bets: Bet[]): RouletteOutcome {
  const outcome = random.choice(outcomes);

  const results: resultBet[] = [];

  let totalWinnings = 0;
  for (const bet of bets) {
    let betWinnings;
    if (bet.pockets.includes(outcome)) {
      const factor = amountOfPocketsToWinnings.get(bet.pockets.length);
      if (factor === undefined) {
        throw new Error(`Could not find factor for ${bet.pockets.join(",")}`);
      }

      betWinnings = bet.amount * factor;
    } else {
      betWinnings = -bet.amount;
    }

    totalWinnings += betWinnings;

    results.push({ success: betWinnings > 0, winnings: betWinnings, ...bet });
  }

  return {
    results,
    success: totalWinnings > 0,
    winnings: totalWinnings,
    outcome: outcome,
  };
}

export function createEmbed(
  totalBetAmount: number,
  outcome: RouletteOutcome,
  name: string,
  betId?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("Roulette")
    .setColor(outcome.success ? "Green" : "Red")
    .setDescription(`${name} heeft ${totalBetAmount} punten ingezet.`)
    .addFields(
      {
        name: `🎲 De uitkomst was ${outcome.outcome}`,
        value:
          (outcome.success
            ? `${name} heeft ${outcome.winnings} punten gewonnen.`
            : `${name} is ${-outcome.winnings} punten verloren.`) +
          "\n\n**Alle bets:**",
      },
      ...outcome.results.map((bet) => ({
        name: `${bet.success ? "✅" : "❌"} ${bet.name}`,
        value: `winst: ${bet.winnings}`,
        inline: true,
      })),
    );

  if (betId) {
    embed.setFooter({ text: `Bet-ID: ${betId}` });
  }

  return embed;
}
