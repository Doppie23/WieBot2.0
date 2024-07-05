import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import random from "../../../utils/random";

const MINE = "💣";
const DIAMOND = "💎";
const COVERED = "🟩";

export class Mines {
  private squaresX = 5;
  private squaresY = 4;
  private squares: Square[] = [];

  private diamondsClicked = 0;
  private mineClicked = false;
  private userCashesOut = false;

  private cashoutRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("cashout")
      .setLabel("Cashout")
      .setStyle(ButtonStyle.Danger),
  );

  public rows: ActionRowBuilder<ButtonBuilder>[];

  constructor(
    private mineCount: number,
    private amount: number,
    private username: string,
  ) {
    if (this.squaresX > 5 || this.squaresY > 4) {
      throw new Error("Squares can't be bigger than 5x4");
    }

    for (let i = 0; i < this.squaresX * this.squaresY; i++) {
      const square = new Square(i);
      if (i < this.mineCount) {
        square.isMine = true;
      }
      this.squares.push(square);
    }
    random.shuffle(this.squares);

    // correct the index
    for (let i = 0; i < this.squares.length; i++) {
      this.squares[i]!.setIndex(i);
    }

    this.rows = this.createRows();
  }

  private createRows(): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < this.squaresY; i++) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let j = 0; j < this.squaresX; j++) {
        row.addComponents(this.squares[i * this.squaresX + j]!.button);
      }
      rows.push(row);
    }
    rows.push(this.cashoutRow);
    return rows;
  }

  public handleClickInteraction(interaction: ButtonInteraction): void {
    if (interaction.customId === "cashout" || this.userCashesOut) {
      this.userCashesOut = true;
      return;
    }

    const index = parseInt(interaction.customId.split(":")[1] ?? "");
    if (isNaN(index)) return;

    const square = this.squares[index];
    if (!square) return;

    if (!square.isClicked) {
      square.click();
      if (square.isMine) {
        this.mineClicked = true;
      } else {
        this.diamondsClicked++;
      }
    }
  }

  public createEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle("Mines")
      .setColor(this.mineClicked ? "Red" : "Green")
      .setDescription(`${this.username} heeft ${this.amount} punten ingezet.`)
      .setFields(
        {
          name: `${MINE} Aantal mijnen:`,
          value: this.mineCount.toString(),
        },
        {
          name: `💰 Payout (${this.getPayoutFactor().toFixed(2)})`,
          value: this.payout.toString(),
        },
      );
  }

  public get isGameOver(): boolean {
    return this.mineClicked || this.userCashesOut;
  }

  public get payout(): number {
    return this.mineClicked
      ? 0
      : Math.floor(this.getPayoutFactor() * this.amount);
  }

  public get isSuccess(): boolean {
    return !this.mineClicked;
  }

  private getPayoutFactor(): number {
    const mines = this.mineCount;
    const diamonds = this.diamondsClicked;
    const squares = this.squares.length;
    const x = squares - mines;
    function factorial(number: number) {
      let value = number;
      for (let i = number; i > 1; i--) value *= i - 1;
      return value;
    }
    function combination(n: number, d: number) {
      if (n === d) return 1;
      return factorial(n) / (factorial(d) * factorial(n - d));
    }
    const first = combination(squares, diamonds);
    const second = combination(x, diamonds);
    let result = 0.99 * (first / second);
    result = Math.round(result * 100) / 100;

    return isNaN(result) ? 0 : result;
  }
}

class Square {
  public isMine = false;
  public uncovered = false;
  public button: ButtonBuilder;
  public id: string = "";
  public isClicked = false;

  constructor(index: number) {
    this.button = new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel(COVERED);
    this.setIndex(index);
  }

  public setIndex(index: number): void {
    this.id = `mineSquare:${index}`;
    this.button.setCustomId(this.id);
  }

  public click(): void {
    this.button.setLabel(this.isMine ? MINE : DIAMOND);
    this.isClicked = true;
  }
}
