import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type {
  APIApplicationCommandOptionChoice,
  ChatInputCommandInteraction,
} from "discord.js";
import * as rng from "../../../helpers/RngHelper";
import random from "../../../utils/random";

const options = [
  {
    name: "Steen",
    emoji: "🗻",
  },
  {
    name: "Papier",
    emoji: "📃",
  },
  {
    name: "Kool",
    emoji: "🥬",
  },
] as const;

type Option = (typeof options)[number];

function optionToString(option: Option): string {
  return option.emoji + " " + option.name;
}

export const data = new SlashCommandBuilder()
  .setName("steen-papier-kool")
  .setDescription("Steen, Papier, Kool!")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Hoeveel punten wil je inzetten?")
      .setRequired(true)
      .setMinValue(1),
  )
  .addStringOption((option) =>
    option
      .setName("option")
      .setDescription("Wat wordt je zet?")
      .setRequired(true)
      .addChoices(
        ...options.map(
          (option): APIApplicationCommandOptionChoice<string> => ({
            name: optionToString(option),
            value: option.name,
          }),
        ),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = await rng.getBetAmount(interaction);
  if (amount === undefined) return;

  const userOption = interaction.options.getString("option")!;
  const userChoice = options.find((option) => option.name === userOption);
  if (!userChoice) {
    throw new Error(
      `Option ${userChoice} is not a valid choice from ${options.join(", ")}`,
    );
  }

  const computerChoice = random.choice(options);

  let outcome: "draw" | "user" | "computer" = "computer";

  if (userChoice === computerChoice) {
    outcome = "draw";
  }

  if (
    (userChoice.name === "Steen" && computerChoice.name === "Kool") ||
    (userChoice.name === "Kool" && computerChoice.name === "Papier") ||
    (userChoice.name === "Papier" && computerChoice.name === "Steen")
  ) {
    outcome = "user";
  }

  const embed = new EmbedBuilder()
    .setTitle("Steen, Papier, Kool!")
    .setColor(
      outcome === "draw" ? "Grey" : outcome === "user" ? "Green" : "Red",
    )
    .setDescription(
      outcome === "draw"
        ? `Gelijkspel! ${interaction.user.displayName} mag zijn ${amount} punten houden.`
        : outcome === "user"
        ? `${interaction.user.displayName} heeft ${amount} punten gewonnen.`
        : `${interaction.user.displayName} is ${amount} punten verloren.`,
    )
    .setFields(
      {
        name: interaction.user.displayName,
        value: optionToString(userChoice),
        inline: true,
      },
      {
        name: "Computer",
        value: optionToString(computerChoice),
        inline: true,
      },
    );

  if (outcome !== "draw") {
    rng.updateScore(
      interaction.user.id,
      interaction.guildId!,
      outcome === "user" ? amount : -amount,
    );
  }

  await interaction.reply({ embeds: [embed] });
}
