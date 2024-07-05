import { ActionRowBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import { ButtonBuilder, ChatInputCommandInteraction } from "discord.js";
import db from "../../../db/db";
import { Blackjack } from "./Blackjack";

export const data = new SlashCommandBuilder()
  .setName("blackjack")
  .setDescription("Unlimited Money Glitch 100% WORKING!!1!")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("hoeveel?")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  let amount = interaction.options.getInteger("amount")!;

  const user = db.users.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < amount) {
    await interaction.reply({
      content: "Je hebt te weinig punten!",
      ephemeral: true,
    });
    return;
  }

  db.users.updateRngScore(interaction.user.id, interaction.guildId!, -amount);

  const getDoubleDownStatus = () => {
    const user = db.users.getUser(interaction.user.id, interaction.guildId!);
    return {
      canDoubleDown: user!.rngScore! >= amount * 2,
      canAllIn: user!.rngScore! > amount,
      score: user!.rngScore!,
    };
  };

  const { canDoubleDown, canAllIn } = getDoubleDownStatus();

  const hit = new ButtonBuilder()
    .setCustomId("hit")
    .setLabel("Hit")
    .setStyle(ButtonStyle.Primary);

  const stand = new ButtonBuilder()
    .setCustomId("stand")
    .setLabel("Stand")
    .setStyle(ButtonStyle.Secondary);

  const doubleDown = new ButtonBuilder()
    .setCustomId("doubleDown")
    .setLabel(canDoubleDown ? "Double Down" : "All In")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(hit, stand);
  const rowWithDoubleDown = new ActionRowBuilder<ButtonBuilder>().addComponents(
    hit,
    stand,
    doubleDown,
  );

  const blackjack = new Blackjack(interaction.user.displayName);

  const response = await interaction.reply({
    embeds: [blackjack.createEmbed(amount)],
    components: !blackjack.isGameOver
      ? [canDoubleDown || canAllIn ? rowWithDoubleDown : row]
      : undefined,
  });

  while (blackjack.isPlayerTurn && !blackjack.isGameOver) {
    try {
      const confirmation = await response.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 180_000,
      });
      if (
        !(
          confirmation.customId === "hit" ||
          confirmation.customId === "stand" ||
          confirmation.customId === "doubleDown"
        )
      ) {
        throw new Error("Invalid component");
      }

      if (blackjack.isGameOver) {
        throw new Error("Game over");
      }

      if (confirmation.customId === "doubleDown") {
        const status = getDoubleDownStatus();
        if (status.canDoubleDown) {
          db.users.updateRngScore(
            interaction.user.id,
            interaction.guildId!,
            -amount,
          );
          amount *= 2;
        } else if (status.canAllIn) {
          db.users.updateRngScore(
            interaction.user.id,
            interaction.guildId!,
            -status.score,
          );
          amount = status.score;
        } else {
          // user can't double down or all in, but still hit the button
          confirmation.reply({
            content: "Hier heb je niet genoeg punten voor.",
            ephemeral: true,
          });
          interaction.editReply({
            embeds: [blackjack.createEmbed(amount)],
            components: [row],
          });
          continue;
        }
      }

      blackjack.playerTurn(confirmation.customId);
      await interaction.editReply({
        embeds: [blackjack.createEmbed(amount)],
        components: [row],
      });
      await confirmation.deferUpdate();
    } catch (e) {
      // timeout
      await interaction.followUp({
        content: "Je wachtte te lang.",
        ephemeral: true,
      });
      db.users.updateRngScore(
        interaction.user.id,
        interaction.guildId!,
        amount,
      );
      return;
    }
  }

  if (blackjack.isGameOver) {
    // remove buttons
    interaction.editReply({
      embeds: [blackjack.createEmbed(amount)],
      components: [],
    });
  }

  let firstDealerTurn = true;
  while (blackjack.isDealerTurn && !blackjack.isGameOver) {
    !firstDealerTurn &&
      (await new Promise((resolve) => setTimeout(resolve, 500)));
    firstDealerTurn = false;

    blackjack.dealerTurn();
    interaction.editReply({
      embeds: [blackjack.createEmbed(amount)],
      components: [],
    });
  }

  const winner = blackjack.getWinner();

  if (winner === "player") {
    db.users.updateRngScore(
      interaction.user.id,
      interaction.guildId!,
      amount * 2,
    );
  }
}
