import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import random from "../../utils/random";
import db from "../../db/db";

export const data = new SlashCommandBuilder()
  .setName("roulette")
  .setDescription("rng certified")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("hoeveel?")
      .setRequired(true)
      .setMinValue(1),
  )
  .addStringOption((option) =>
    option.setName("type").setDescription("type").setRequired(true).addChoices(
      {
        name: "Even",
        value: "even",
      },
      {
        name: "Oneven",
        value: "odd",
      },
      {
        name: "Getal",
        value: "number",
      },
    ),
  )
  .addStringOption((option) =>
    option.setName("nummer").setDescription("Welk nummer?"),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = interaction.options.getInteger("amount")!;
  const type = interaction.options.getString("type")!;
  const number = interaction.options.getString("nummer");

  if (!(type === "even" || type === "odd" || type === "number")) {
    throw new Error(`Roulette type ${type} is not valid`);
  }

  if (type === "number" && !number) {
    await interaction.reply({
      content: "Geef ook een nummer op als je op een nummer in wil zetten.",
      ephemeral: true,
    });
    return;
  }

  let options: RouletteOptions;
  if (type === "number" && number) {
    options = {
      amount,
      type: "number",
      number,
    };
  } else if (type === "even") {
    options = {
      amount,
      type: "even",
    };
  } else {
    options = {
      amount,
      type: "odd",
    };
  }

  const user = db.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < options.amount) {
    await interaction.reply({
      content: "Je hebt te weinig punten!",
      ephemeral: true,
    });
    return;
  }

  let outcome = spinRoulette(options);
  db.updateRngScore(
    interaction.user.id,
    interaction.guildId!,
    outcome.success ? outcome.winnings : -options.amount,
  );

  await interaction.reply({
    embeds: [createEmbed(options, outcome, interaction.user.displayName)],
  });
}

function createEmbed(
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

type RouletteOptions =
  | {
      amount: number;
      type: "even" | "odd";
    }
  | {
      amount: number;
      type: "number";
      number: string;
    };

// prettier-ignore
const outcomes = ["0", "00", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36"]
// prettier-ignore
const odds = [1, 1, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35]

type RouletteOutcome = { success: boolean; winnings: number; outcome: string };

function spinRoulette(options: RouletteOptions): RouletteOutcome {
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
