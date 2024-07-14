import {
  ActionRowBuilder,
  BooleanCache,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  Message,
} from "discord.js";
import rng from "../../../helpers/RngHelper";
import { Deck, Card } from "../../../common/Deck";

export const data = new rng.SlashCommandBuilder()
  .setName("hoger-lager")
  .setDescription("epic description")
  .addBetAmountOption();

type HigherLowerState = {
  winnings: number;
  cards: Card[];
} & (
  | {
      gameover: true;
      playerWon: boolean;
    }
  | {
      gameover: false;
    }
) &
  (
    | {
        userChoice: "higher" | "lower";
        higherPayout: number;
        lowerPayout: number;
      }
    | {
        userChoice?: undefined;
        higherPayout?: undefined;
        lowerPayout?: undefined;
      }
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = await rng.SlashCommandBuilder.getBetAmount(interaction);
  if (amount === undefined) return;

  await rng.playRngGame(interaction, amount, async () => {
    const deck = new Deck();

    const totalCardNumbers = Deck.values.size;
    const lowestCardValue = [...Deck.values.values()][0]!;

    const cashoutRow = createCashoutRow();

    let state: HigherLowerState = {
      gameover: false,
      winnings: amount,
      cards: [],
    };

    while (!state.gameover) {
      const newCard = deck.pop();
      state.cards.push(newCard);

      if (state.userChoice) {
        // not first round, user made a choice

        const canContinue = addRoundWinnings(state, newCard);

        if (!canContinue) {
          // user guess was wrong
          state = {
            ...state,
            gameover: true,
            playerWon: false,
          };
          break;
        }
      }

      const higherCards =
        totalCardNumbers - newCard.value + (lowestCardValue - 1);
      const lowerCards = newCard.value - lowestCardValue;

      const higherPayout = Math.floor(
        ((totalCardNumbers - higherCards) / totalCardNumbers) * state.winnings,
      );
      const lowerPayout = Math.floor(
        ((totalCardNumbers - lowerCards) / totalCardNumbers) * state.winnings,
      );

      let response: Message<BooleanCache<CacheType>>;
      if (interaction.replied) {
        response = await interaction.editReply({
          embeds: [createEmbed(interaction.user.displayName, amount, state)],
          components: [createButtonRow(higherPayout, lowerPayout), cashoutRow],
        });
      } else {
        response = await interaction.reply({
          embeds: [createEmbed(interaction.user.displayName, amount, state)],
          components: [createButtonRow(higherPayout, lowerPayout), cashoutRow],
          fetchReply: true,
        });
      }

      const confirmation = await response.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 180_000,
      });

      if (
        confirmation.customId !== "cashout" &&
        confirmation.customId !== "higher" &&
        confirmation.customId !== "lower"
      ) {
        throw new Error("Invalid component");
      }

      await confirmation.deferUpdate();

      if (confirmation.customId === "cashout") {
        state = {
          ...state,
          gameover: true,
          playerWon: true,
        };
      } else {
        state = {
          ...state,
          lowerPayout,
          higherPayout,
          userChoice: confirmation.customId,
        };
      }
    }

    rng.updateScore(interaction.user.id, interaction.guildId!, state.winnings);

    await interaction.editReply({
      embeds: [createEmbed(interaction.user.displayName, amount, state)],
      components: [],
    });
  });
}

/**
 * @returns boolean indicating if the game can continue
 */
function addRoundWinnings(state: HigherLowerState, newCard: Card): boolean {
  const previousCard = state.cards[state.cards.length - 2]!;

  if (newCard.value === previousCard.value) {
    return true;
  }

  if (state.userChoice === "higher" && newCard.value > previousCard.value) {
    state.winnings += state.higherPayout;
    return true;
  }

  if (state.userChoice === "lower" && newCard.value < previousCard.value) {
    state.winnings += state.lowerPayout;
    return true;
  }

  return false;
}

function createEmbed(
  username: string,
  amount: number,
  state: HigherLowerState,
) {
  return new EmbedBuilder()
    .setTitle("Hoger-lager")
    .setColor(!state.gameover ? "Grey" : state.playerWon ? "Green" : "Red")
    .setDescription(
      !state.gameover
        ? `${username} heeft ${amount} punten ingezet.`
        : state.playerWon
        ? `${username} heeft ${state.winnings - amount} punten gewonnen!`
        : `${username} is ${amount} punten verloren!`,
    )
    .addFields(
      [
        {
          name: "Kaarten",
          value: state.cards.map((card) => card.toString()).join(", "),
        },
        !state.gameover
          ? {
              name: "Payout",
              value: state.winnings.toString(),
            }
          : undefined,
      ].filter((f) => f !== undefined),
    );
}

function createCashoutRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("cashout")
      .setLabel(`Cashout!`)
      .setStyle(ButtonStyle.Success),
  );
}

function createButtonRow(higherPayout: number, lowerPayout: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("higher")
      .setLabel(`🔼 Hoger (+${higherPayout})`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("lower")
      .setLabel(`🔽 Lager (+${lowerPayout})`)
      .setStyle(ButtonStyle.Secondary),
  );
}
