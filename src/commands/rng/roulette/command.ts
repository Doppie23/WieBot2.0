import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { createEmbed, spinRoulette } from "./roulette";
import rng from "../../../helpers/RngHelper";
import db from "../../../db/db";

export type Bet = {
  amount: number;
  pockets: number[];
  name: string;
};

export const data = new SlashCommandBuilder()
  .setName("roulette")
  .setDescription("rng certified")
  .addStringOption((option) =>
    option
      .setName("bet-id")
      .setDescription("`/roulette-help` voor meer info.")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const betId = interaction.options.getString("bet-id")!;

  const bets = getBetFromId(betId);
  if (!bets) {
    await interaction.editReply({
      content: "Je Bet-ID is ongeldig, probeer het opnieuw.",
      components: [],
      embeds: [],
    });
    return;
  }

  const totalBetAmount = bets.reduce((acc, bet) => acc + bet.amount, 0);

  const user = db.users.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < totalBetAmount) {
    await interaction.editReply({
      content: "Daar heb je niet genoeg punten voor, probeer het opnieuw.",
      components: [],
      embeds: [],
    });
    return;
  }

  const outcome = spinRoulette(bets);

  rng.updateScore(interaction.user.id, interaction.guildId!, outcome.winnings);

  await interaction.deleteReply();
  await interaction.channel!.send({
    embeds: [
      createEmbed(totalBetAmount, outcome, interaction.user.displayName, betId),
    ],
  });
}

function getBetFromId(betId: string): Bet[] | undefined {
  try {
    const decoded = base64ToString(betId);

    const json = JSON.parse(decoded) as unknown;

    if (
      json instanceof Array &&
      json.every(
        (bet) =>
          bet instanceof Object &&
          "amount" in bet &&
          "pockets" in bet &&
          typeof (bet as Bet).amount === "number" &&
          Array.isArray((bet as Bet).pockets) &&
          (bet as Bet).pockets.every((pocket) => typeof pocket === "number"),
      )
    ) {
      return json as Bet[];
    }
    throw new SyntaxError(`Invalid bet id ${betId}`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
}

function base64ToString(base64: string) {
  const binString = atob(base64);
  const bytes = Uint8Array.from(binString, (v) => v.codePointAt(0)!);
  return new TextDecoder().decode(bytes);
}
