import {
  ChatInputCommandInteraction,
  SlashCommandBuilder as _SlashCommandBuilder,
} from "discord.js";
import db from "../db/db";

/**
 * Removes the bet amount from the user's score and returns functions to end the game and handle all db logic
 */
function placeBet(
  userId: string,
  guildId: string,
  amount: number,
  interaction: ChatInputCommandInteraction,
) {
  // cannot use interaction.user.id here, because some games allow multiple users for the same interaction

  let totalBetAmount = amount;
  db.users.updateRngScore(userId, guildId, -amount);

  const increaseBetAmount = (amountToAdd: number) => {
    totalBetAmount += amountToAdd;
    db.users.updateRngScore(userId, guildId, -amountToAdd);
  };

  const loss = () => {
    db.rngRecords.createLossRecord(
      userId,
      guildId,
      totalBetAmount,
      interaction.commandName,
    );
  };

  const win = (amount: number) => {
    db.users.updateRngScore(userId, guildId, amount);
    db.rngRecords.createLossRecord(
      userId,
      guildId,
      amount - totalBetAmount,
      interaction.commandName,
    );
  };

  const refund = () => {
    db.users.updateRngScore(userId, guildId, totalBetAmount);
  };

  return {
    /**
     * Increases the bet amount by the given amount
     */
    increaseBetAmount,
    /**
     * Records the win and adds the amount
     * @param amount The amount the user won, including the bet amount
     */
    win,
    /**
     * Records the loss and makes it definitive
     */
    loss,
    /**
     * Refunds the bet, as if nothing happened
     */
    refund,
  };
}

/**
 * Wrapper around `placeBet` that handles any errors that may occur while playing the game,
 * and automatically refunds the bet if an error occurs
 *
 * @param cb callback where the game is played
 */
async function playRngGame(
  interaction: ChatInputCommandInteraction,
  amount: number,
  cb: (cbs: ReturnType<typeof placeBet>) => Promise<void>,
) {
  // its fine to just use interaction.user.id here, because this can only be used for single player games

  const { win, loss, increaseBetAmount, refund } = placeBet(
    interaction.user.id,
    interaction.guildId!,
    amount,
    interaction,
  );

  try {
    await cb({ increaseBetAmount, win, loss, refund });
  } catch (error) {
    refund();

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
 * For games that are instantly played, without any user interaction
 *
 * @param amount The value to update the user's score with
 */
function playInstantRngGame(
  userId: string,
  guildId: string,
  amount: number,
  interaction: ChatInputCommandInteraction,
) {
  db.users.updateRngScore(userId, guildId, amount);

  if (amount >= 0) {
    db.rngRecords.createWinRecord(
      userId,
      guildId,
      amount,
      interaction.commandName,
    );
  } else {
    db.rngRecords.createLossRecord(
      userId,
      guildId,
      -amount,
      interaction.commandName,
    );
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
        content: `Zo rijk ben je nou ook weer niet, je hebt ${user!
          .rngScore!} punten.`,
        ephemeral: true,
      });
      return;
    }

    return amount;
  }
}

const rng = {
  placeBet,
  playRngGame,
  playInstantRngGame,
  getScaleFactor,
  SlashCommandBuilder,
};

export default rng;
