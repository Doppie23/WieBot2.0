import {
  ChatInputCommandInteraction,
  SlashCommandBuilder as _SlashCommandBuilder,
} from "discord.js";
import db from "../db/db";

/**
 * Removes the bet amount from the user's score
 *
 * When an error occurs, the bet amount is put back in the user's score and the interaction is replied to
 * @param cb callback where the game is played
 */
async function playRngGame(
  interaction: ChatInputCommandInteraction,
  amount: number,
  cb: (increaseBetAmount: (amountToAdd: number) => void) => Promise<void>,
) {
  updateScore(interaction.user.id, interaction.guildId!, -amount);

  let amountToRetrunOnError = amount;

  const increaseBetAmount = (amountToAdd: number) => {
    db.users.updateRngScore(
      interaction.user.id,
      interaction.guildId!,
      -amountToAdd,
    );
    amountToRetrunOnError += amountToAdd;
  };

  try {
    await cb(increaseBetAmount);
  } catch (error) {
    db.users.updateRngScore(
      interaction.user.id,
      interaction.guildId!,
      amountToRetrunOnError,
    );

    if ((error as { code?: string }).code === "InteractionCollectorError") {
      await interaction.followUp({
        content:
          "Je wachtte te lang met het spelen, je hebt je punten weer terug gekregen.",
        ephemeral: true,
      });
      return;
    }

    // unknow error
    throw error;
  }
}

/**
 * Updates the user's score and keeps track of the session
 */
function updateScore(userId: string, guildId: string, amount: number) {
  try {
    keepTrackOfSession(userId, guildId);
  } catch (e) {
    console.error("Error while keeping track of session", e);
  }

  db.users.updateRngScore(userId, guildId, amount);
}

function keepTrackOfSession(userId: string, guildId: string) {
  if (!db.rngSessions.hasActiveSession(userId, guildId)) {
    const user = db.users.getUser(userId, guildId);
    db.rngSessions.startSession(userId, guildId, user!.rngScore!);
  } else {
    db.rngSessions.refreshSession(userId, guildId);
  }
}

/**
 * Return a scale factor based on the current highest score
 *
 * Factor will be at least 1
 *
 * @argument zerosToRemove How many zeros to remove from the scale factor
 *
 * @example
 * console.log(getScaleFactor("<guildId>", 2)); // highest score is 5308
 * // 10
 * console.log(getScaleFactor("<guildId>", 0)); // highest score is 135
 * // 100
 */
function getScaleFactor(guildId: string, zerosToRemove: number = 0): number {
  const highestScore = db.users.getHighestRngScore(guildId);
  if (highestScore <= 0) return 1;

  return Math.max(
    1,
    Math.pow(10, Math.floor(Math.log10(highestScore)) - zerosToRemove),
  );
}

class SlashCommandBuilder extends _SlashCommandBuilder {
  /**
   * Adds an integer option to the command
   * that requires the user to provide the amount of points they want to bet
   */
  public addBetAmountOption(options?: {
    name?: string;
    description?: string;
    required?: boolean;
  }) {
    this.addIntegerOption((option) =>
      option
        .setName(options?.name ?? "amount")
        .setDescription(
          options?.description ?? "Hoeveel punten wil je inzetten?",
        )
        .setRequired(options?.required ?? true)
        .setMinValue(1),
    );

    return this;
  }

  /**
   * Gets the user provided bet amount using the interaction
   * @returns undefined if the user does not have enough points, or something else went wrong
   */
  public static async getBetAmount(
    interaction: ChatInputCommandInteraction,
    fieldName: string = "amount",
  ): Promise<number | undefined> {
    const amount = interaction.options.getInteger(fieldName);

    if (amount === null) {
      await interaction.reply({
        content: "Je moet een hoeveelheid punten opgeven.",
        ephemeral: true,
      });
      return;
    }

    if (amount < 1) {
      await interaction.reply({
        content: "Je moet 1 of meer punten inzetten.",
        ephemeral: true,
      });
      return;
    }

    const user = db.users.getUser(interaction.user.id, interaction.guildId!);
    if (user!.rngScore! < amount) {
      await interaction.reply({
        content: "Zo rijk ben je nou ook weer niet.",
        ephemeral: true,
      });
      return;
    }

    return amount;
  }
}

const rng = {
  playRngGame,
  updateScore,
  keepTrackOfSession,
  getScaleFactor,
  SlashCommandBuilder,
};

export default rng;
