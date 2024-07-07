import { ChatInputCommandInteraction } from "discord.js";
import db from "../db/db";

/**
 * Gets the user provided bet amount using the interaction
 * @returns undefined if the user does not have enough points, or something else went wrong
 */
export async function getBetAmount(
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

/**
 * Removes the bet amount from the user's score
 *
 * When an error occurs, the bet amount is put back in the user's score and the interaction is replied to
 * @param cb callback where the game is played
 */
export async function playRngGame(
  interaction: ChatInputCommandInteraction,
  amount: number,
  cb: (amount: number) => Promise<void>,
) {
  db.users.updateRngScore(interaction.user.id, interaction.guildId!, -amount);

  try {
    await cb(amount);
  } catch (error) {
    db.users.updateRngScore(interaction.user.id, interaction.guildId!, amount);

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
