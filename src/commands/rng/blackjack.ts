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

  const user = db.users.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < amount) {
    await interaction.reply({
      content: "Je hebt te weinig punten!",
      ephemeral: true,
    });
    return;
  }

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

  const blackjack = new Blackjack();

  const response = await interaction.reply({
    embeds: [blackjack.createEmbed(interaction.user.displayName, amount)],
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
          amount *= 2;
        } else if (status.canAllIn) {
          amount = status.score;
        }
      }

      blackjack.playerTurn(confirmation.customId);
      await interaction.editReply({
        embeds: [blackjack.createEmbed(interaction.user.displayName, amount)],
        components: [row],
      });
      await confirmation.deferUpdate();
    } catch (e) {
      // timeout
      await interaction.followUp({
        content: "Je wachtte te lang.",
        ephemeral: true,
      });
      return;
    }
  }

  if (blackjack.isGameOver) {
    // remove buttons
    interaction.editReply({
      embeds: [blackjack.createEmbed(interaction.user.displayName, amount)],
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
      embeds: [blackjack.createEmbed(interaction.user.displayName, amount)],
      components: [],
    });
  }

  const winner = blackjack.getWinner();

  if (winner === "player") {
    db.users.updateRngScore(interaction.user.id, interaction.guildId!, amount);
  } else if (winner === "dealer") {
    db.users.updateRngScore(interaction.user.id, interaction.guildId!, -amount);
  }
}

type Card = {
  value: number;
  suit: string;
  number: string;
};

type PlayerType = "player" | "dealer";

class Blackjack {
  private deck: Card[];

  private player: Player;
  private dealer: Player;

  // private currentTurn: PlayerType = "player";
  private currentPlayer: Player;
  private gameOver: boolean = false;
  private winner: PlayerType | null = null;

  private status: string = "Spelers beurt.";

  constructor() {
    this.deck = Blackjack.createDeck();
    random.shuffle(this.deck);

    this.player = new Player([this.deck.pop()!, this.deck.pop()!]);
    this.dealer = new Player([this.deck.pop()!, this.deck.pop()!]);

    this.currentPlayer = this.player;
    // this.player = new Player([
    //   { number: "J", suit: "♠️", value: 10 },
    //   { number: "J", suit: "♠️", value: 10 },
    // ]);
    // this.dealer = new Player([
    //   { number: "J", suit: "♠️", value: 10 },
    //   { number: "J", suit: "♠️", value: 10 },
    // ]);

    if (this.player.hasBlackjack && !this.dealer.hasBlackjack) {
      this.setWinner("player");
      this.status = "Speler heeft Blackjack!";
      return;
    }

    if (this.dealer.hasBlackjack && this.player.hasBlackjack) {
      this.setWinner(null);
      this.status = "Gelijkspel.";
      return;
    }
  }

  public get isPlayerTurn(): boolean {
    return this.currentPlayer === this.player;
  }

  public get isDealerTurn(): boolean {
    return this.currentPlayer === this.dealer;
  }

  public get isGameOver(): boolean {
    return this.gameOver;
  }

  public getWinner(): PlayerType | null {
    return this.winner;
  }

  private switchCurrentPlayer(): void {
    this.currentPlayer =
      this.currentPlayer === this.player ? this.dealer : this.player;
  }

  public playerTurn(action: "hit" | "stand" | "doubleDown"): void {
    if (action === "hit" || action === "doubleDown") {
      this.player.hand.push(this.deck.pop()!);
      if (this.player.handValue > 21) {
        this.setWinner("dealer");
        this.status = "Speler is gebust.";
        return;
      }
    }

    if (action !== "hit") {
      // this.currentTurn = "dealer";
      this.switchCurrentPlayer();
      this.status = "Dealers beurt.";
    }
  }

  public dealerTurn(): void {
    if (this.dealer.handValue >= 17) {
      this.setFinalWinner();
      return;
    }

    this.dealer.hand.push(this.deck.pop()!);
    if (this.dealer.handValue > 21) {
      this.setWinner("player");
      this.status = "Dealer is gebust.";
      return;
    }

    if (this.dealer.handValue >= 17) {
      this.setFinalWinner();
    }
  }

  private setFinalWinner(): void {
    const playerHandValue = this.player.handValue;
    const dealerHandValue = this.dealer.handValue;

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

  private setWinner(winner: PlayerType | null): void {
    this.gameOver = true;
    this.winner = winner;
    // set turn to dealer, so all cards are shown
    this.currentPlayer = this.dealer;
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
      name: "Speler hand " + (this.gameOver && ` (${this.player.handValue})`),
      value: this.player.hand.map((card) => card.number + card.suit).join(", "),
    });

    const hideDealerHand = this.isPlayerTurn;
    if (!hideDealerHand) {
      fields.push({
        name: "Dealer hand " + (this.gameOver && ` (${this.dealer.handValue})`),
        value: this.dealer.hand
          .map((card) => card.number + card.suit)
          .join(", "),
      });
    } else {
      fields.push({
        name: "Dealer hand",
        value:
          this.dealer.hand[0]?.number! +
          this.dealer.hand[0]?.suit! +
          ", " +
          "⬛",
      });
    }

    embed.addFields(fields);

    return embed;
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

class Player {
  public hand: Card[];
  public hasBlackjack: boolean;

  constructor(startingHand: [Card, Card]) {
    this.hand = [startingHand[0], startingHand[1]];
    this.hasBlackjack = this.handValue === 21;
  }

  public get handValue(): number {
    let total = 0;
    let numberOfAces = 0;
    for (const card of this.hand) {
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
}
