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
  private squaresX: number;
  private squaresY: number;
  private squares: Square[] = [];

  private diamondCount;
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
    options: { squaresX: number; squaresY: number },
  ) {
    this.squaresX = options.squaresX;
    this.squaresY = options.squaresY;

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

    this.diamondCount = this.squares.length - this.mineCount;

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
      this.revealMines();
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
        this.revealMines();
        return;
      } else {
        this.diamondsClicked++;
      }
    }

    if (this.diamondsClicked === this.diamondCount) {
      // no more diamonds left, player wins
      this.userCashesOut = true;
      this.revealMines();
    }
  }

  private revealMines(): void {
    for (const square of this.squares) {
      square.click();
      square.button.setDisabled(true);
    }
    this.cashoutRow.components.forEach((c) => c.setDisabled(true));
  }

  public createEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`Mines ${MINE}`)
      .setColor(this.mineClicked ? "Red" : "Green")
      .setDescription(`${this.username} heeft ${this.amount} punten ingezet.`)
      .setFields(
        {
          name: `${DIAMOND} Diamanten gevonden`,
          value: this.diamondsClicked + "/" + this.diamondCount,
        },
        {
          name: `💰 Payout (${this.getPayoutFactor().toFixed(2)})`,
          value: `${this.payout.toString()} punten`,
        },
      );
  }

  public get isGameOver(): boolean {
    return this.mineClicked || this.userCashesOut;
  }

  public get payout(): number {
    return Math.floor(this.getPayoutFactor() * this.amount);
  }

  public get isSuccess(): boolean {
    return !this.mineClicked;
  }

  // https://calculatorscity.com/stake-mines-calculator/
  private getPayoutFactor(): number {
    if (this.mineClicked || this.diamondsClicked === 0) return 0;

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
