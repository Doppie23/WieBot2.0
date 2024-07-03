import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import db from "../../db/db";
import random from "../../utils/random";

export const data = new SlashCommandBuilder()
  .setName("trinna")
  .setDescription("trinna is altijd goed")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("hoeveel?")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = interaction.options.getInteger("amount")!;

  const user = db.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < amount) {
    await interaction.reply({
      content: "Je hebt te weinig punten!",
      ephemeral: true,
    });
    return;
  }

  const result = trinna(amount);

  db.updateRngScore(
    interaction.user.id,
    interaction.guildId!,
    result.positive ? result.winnings : -amount,
  );

  await interaction.reply({
    embeds: [createEmbed(result, interaction.user.displayName)],
  });
}

function createEmbed(result: TrinnaResult, name: string): EmbedBuilder {
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

const options = ["🚂", "🚿", "💡", "🛂", "🚗", "💍"];

type TrinnaResult = {
  amount: number;
  result: string[];
  trainCount: number;
  positive: boolean;
  winnings: number;
};

function trinna(amount: number): TrinnaResult {
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
