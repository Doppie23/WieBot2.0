import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { createEmbed, RouletteOptions, spinRoulette } from "./roulette";
import * as rng from "../../../helpers/RngHelper";

export const data = new SlashCommandBuilder()
  .setName("roulette")
  .setDescription("rng certified")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Hoeveel punten wil je inzetten?")
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
  const amount = await rng.getBetAmount(interaction);
  if (amount === undefined) return;

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

  const outcome = spinRoulette(options);

  rng.updateScore(
    interaction.user.id,
    interaction.guildId!,
    outcome.success ? outcome.winnings : -options.amount,
  );

  await interaction.reply({
    embeds: [createEmbed(options, outcome, interaction.user.displayName)],
  });
}
