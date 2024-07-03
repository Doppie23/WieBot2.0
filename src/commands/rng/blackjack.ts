import {
  ActionRowBuilder,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import {
  APIEmbedField,
  ButtonBuilder,
  ChatInputCommandInteraction,
  RestOrArray,
} from "discord.js";
import db from "../../db/db";
import random from "../../utils/random";

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

  const user = db.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < amount) {
    await interaction.reply({
      content: "Je hebt te weinig punten!",
      ephemeral: true,
    });
    return;
  }

  const getDoubleDownStatus = () => {
    const user = db.getUser(interaction.user.id, interaction.guildId!);
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

  const blackjack = new Blackjack();

  const response = await interaction.reply({
    embeds: [blackjack.createEmbed(interaction.user.displayName, amount)],
    components: [canDoubleDown || canAllIn ? rowWithDoubleDown : row],
  });

  while (blackjack.currentPlayer === "player" && !blackjack.isGameOver) {
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

      let action = confirmation.customId;

      if (action === "doubleDown") {
        const status = getDoubleDownStatus();
        if (status.canDoubleDown) {
          amount *= 2;
        } else if (status.canAllIn) {
          amount = status.score;
        }
        action = "hit";
      }

      blackjack.playerTurn(action === "hit" ? "hit" : "stand");
      await interaction.editReply({
        embeds: [blackjack.createEmbed(interaction.user.displayName, amount)],
        components: [row],
      });
      await confirmation.deferUpdate();
    } catch (e) {
      // timeout
      break;
    }
  }

  while (blackjack.currentPlayer === "dealer" && !blackjack.isGameOver) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    blackjack.dealerTurn();
    interaction.editReply({
      embeds: [blackjack.createEmbed(interaction.user.displayName, amount)],
      components: [],
    });
  }

  interaction.editReply({
    embeds: [blackjack.createEmbed(interaction.user.displayName, amount)],
    components: [],
  });

  const winner = blackjack.getWinner();

  if (winner === "player") {
    db.updateRngScore(interaction.user.id, interaction.guildId!, amount);
  } else if (winner === "dealer") {
    db.updateRngScore(interaction.user.id, interaction.guildId!, -amount);
  }
}

type Card = {
  value: number;
  suit: string;
  number: string;
};

type Player = "player" | "dealer";

class Blackjack {
  private deck: Card[];

  private playerHand: Card[] = [];
  private dealerHand: Card[] = [];

  private currentTurn: Player = "player";
  private gameOver: boolean = false;
  private winner: Player | null = null;

  private status: string = "Spelers beurt.";

  constructor() {
    this.deck = Blackjack.createDeck();
    random.shuffle(this.deck);

    this.playerHand = [this.deck.pop()!, this.deck.pop()!];
    if (this.hasBlackjack()) {
      this.setWinner("player");
      this.status = "Speler heeft Blackjack!";
      return;
    }

    this.dealerHand = [this.deck.pop()!, this.deck.pop()!];
  }

  public get currentPlayer(): Player {
    return this.currentTurn;
  }

  public get isGameOver(): boolean {
    return this.gameOver;
  }

  public getWinner(): Player | null {
    return this.winner;
  }

  public playerTurn(action: "hit" | "stand"): void {
    if (action === "hit") {
      this.playerHand.push(this.deck.pop()!);
      if (this.getHandValue(this.playerHand) > 21) {
        this.setWinner("dealer");
        this.status = "Speler is gebust.";
        return;
      }
    } else {
      this.currentTurn = "dealer";
    }
  }

  public dealerTurn(): void {
    this.status = "Dealers beurt.";
    while (this.getHandValue(this.dealerHand) < 17) {
      this.dealerHand.push(this.deck.pop()!);
      if (this.getHandValue(this.dealerHand) > 21) {
        this.setWinner("player");
        this.status = "Dealer is gebust.";
        return;
      }
    }

    const playerHandValue = this.getHandValue(this.playerHand);
    const dealerHandValue = this.getHandValue(this.dealerHand);

    if (playerHandValue === dealerHandValue) {
      this.setWinner(null);
      this.status = "Gelijkspel.";
    } else if (playerHandValue > dealerHandValue) {
      this.setWinner("player");
      this.status = "Speler heeft gewonnen.";
    } else {
      this.setWinner("dealer");
      this.status = "Dealer heeft gewonnen.";
    }
  }

  private setWinner(winner: Player | null): void {
    this.gameOver = true;
    this.winner = winner;
    this.currentTurn = "dealer";
  }

  public createEmbed(name: string, amount: number): EmbedBuilder {
    let color: ColorResolvable;
    if (!this.gameOver) {
      color = "Grey";
    } else {
      color = this.winner === "player" ? "Green" : "Red";
    }

    const embed = new EmbedBuilder()
      .setTitle("Blackjack")
      .setDescription(`${name} heeft ${amount} punten ingezet.`)
      .setColor(color)
      .setFooter({ text: this.status });

    const fields: RestOrArray<APIEmbedField> = [];

    fields.push({
      name:
        "Speler hand " +
        (this.gameOver && ` (${this.getHandValue(this.playerHand)})`),
      value: this.playerHand.map((card) => card.number + card.suit).join(", "),
    });

    const hideDealerHand = this.currentTurn === "player";
    if (!hideDealerHand) {
      fields.push({
        name:
          "Dealer hand " +
          (this.gameOver && ` (${this.getHandValue(this.dealerHand)})`),
        value: this.dealerHand
          .map((card) => card.number + card.suit)
          .join(", "),
      });
    } else {
      fields.push({
        name: "Dealer hand",
        value:
          this.dealerHand[0]?.number! + this.dealerHand[0]?.suit! + ", " + "⬛",
      });
    }

    embed.addFields(fields);

    return embed;
  }

  private hasBlackjack(): boolean {
    return (
      this.getHandValue(this.playerHand) === 21 && this.playerHand.length === 2
    );
  }

  private getHandValue(hand: Card[]): number {
    let total = 0;
    let numberOfAces = 0;
    for (const card of hand) {
      if (card.number === "A") {
        numberOfAces++;
      }
      total += card.value;
    }
    while (total > 21 && numberOfAces > 0) {
      total -= 10;
      numberOfAces--;
    }
    return total;
  }

  private static createDeck(): Card[] {
    const values = new Map([
      ["2", 2],
      ["3", 3],
      ["4", 4],
      ["5", 5],
      ["6", 6],
      ["7", 7],
      ["8", 8],
      ["9", 9],
      ["10", 10],
      ["J", 10],
      ["Q", 10],
      ["K", 10],
      ["A", 11],
    ]);

    const cardNumbers = [];
    for (const value of values.keys()) {
      cardNumbers.push(value);
    }
    const suits = ["♥️", "♦️", "♣️", "♠️"];

    const deck: Card[] = [];
    for (const suit of suits) {
      for (const number of cardNumbers) {
        deck.push({ number, suit, value: values.get(number)! });
      }
    }

    return deck;
  }
}
