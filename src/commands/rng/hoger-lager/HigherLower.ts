import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { Deck, Card } from "../../../common/Deck";

type Choice = "higher" | "lower";

export class HigherLower {
  private deck;
  public cards: Card[];
  public winnings: number;

  private totalCardNumbers: number;
  private lowestCardValue: number;

  public higherPayout: number;
  public lowerPayout: number;

  public playerWon: boolean | undefined = undefined;

  public components: ActionRowBuilder<ButtonBuilder>[];
  private lowerButton: ButtonBuilder;
  private higherButton: ButtonBuilder;

  constructor(public betAmount: number, private username: string) {
    this.deck = new Deck();
    this.winnings = betAmount;

    this.totalCardNumbers = Deck.values.size;
    this.lowestCardValue = [...Deck.values.values()][0]!;

    const newCard = this.deck.pop();
    this.cards = [newCard];

    const { higherPayout, lowerPayout } = this.calculatePayouts(newCard);
    this.higherPayout = higherPayout;
    this.lowerPayout = lowerPayout;

    this.higherButton = new ButtonBuilder()
      .setCustomId("higher")
      .setStyle(ButtonStyle.Primary);

    this.lowerButton = new ButtonBuilder()
      .setCustomId("lower")
      .setStyle(ButtonStyle.Secondary);

    this.setButtonLabels();

    this.components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        this.higherButton,
        this.lowerButton,
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("cashout")
          .setLabel(`Cashout!`)
          .setStyle(ButtonStyle.Success),
      ),
    ];
  }

  public tick(playerChoice: Choice | "cashout") {
    if (playerChoice === "cashout") {
      this.playerWon = true;
      return;
    }

    const newCard = this.deck.pop();
    this.cards.push(newCard);

    const canContinue = this.addRoundWinnings(playerChoice);
    if (!canContinue) {
      this.playerWon = false;
      return;
    }

    // set payouts for next round

    const { higherPayout, lowerPayout } = this.calculatePayouts(newCard);
    this.higherPayout = higherPayout;
    this.lowerPayout = lowerPayout;

    this.setButtonLabels();
  }

  private calculatePayouts(card: Card) {
    const higherCards =
      this.totalCardNumbers - card.value + (this.lowestCardValue - 1);
    const lowerCards = card.value - this.lowestCardValue;

    const higherPayout = Math.floor(
      ((this.totalCardNumbers - higherCards) / this.totalCardNumbers) *
        this.winnings,
    );
    const lowerPayout = Math.floor(
      ((this.totalCardNumbers - lowerCards) / this.totalCardNumbers) *
        this.winnings,
    );

    return {
      higherPayout,
      lowerPayout,
    };
  }

  private setButtonLabels() {
    this.higherButton.setLabel(`🔼 Hoger (+${this.higherPayout})`);
    this.lowerButton.setLabel(`🔽 Lager (+${this.lowerPayout})`);
  }

  /**
   * @returns boolean indicating if the game can continue
   */
  private addRoundWinnings(playerChoice: Choice): boolean {
    const newCard = this.cards[this.cards.length - 1]!;
    const previousCard = this.cards[this.cards.length - 2]!;

    if (newCard.value === previousCard.value) {
      return true;
    }

    if (playerChoice === "higher" && newCard.value > previousCard.value) {
      this.winnings += this.higherPayout;
      return true;
    }

    if (playerChoice === "lower" && newCard.value < previousCard.value) {
      this.winnings += this.lowerPayout;
      return true;
    }

    return false;
  }

  public get embed() {
    return new EmbedBuilder()
      .setTitle("Hoger Lager")
      .setColor(
        this.playerWon === undefined
          ? "Grey"
          : this.playerWon
          ? "Green"
          : "Red",
      )
      .setDescription(
        this.playerWon === undefined
          ? `${this.username} heeft ${this.betAmount} punten ingezet.`
          : this.playerWon
          ? `${this.username} heeft ${
              this.winnings - this.betAmount
            } punten gewonnen!`
          : `${this.username} is ${this.betAmount} punten verloren!`,
      )
      .addFields(
        [
          {
            name: "Kaarten",
            value: this.cards.map((card) => card.toString()).join(", "),
          },
          this.playerWon === undefined
            ? {
                name: "Payout",
                value: this.winnings.toString(),
              }
            : undefined,
        ].filter((f) => f !== undefined),
      );
  }
}
