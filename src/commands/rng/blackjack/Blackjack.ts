import random from "../../../utils/random";

type Winnings = {
  winnings: number;
  nettoWinnings: number;
};

export class Blackjack {
  public static readonly values = new Map([
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

  private deck: Card[];

  public playerHands: [Hand, ...Hand[]];
  public playerHandIndex = 0;
  public dealerHand: Hand;

  public isGameOver = false;

  public statusMsg: string;

  private winnings: Winnings | undefined;

  constructor(playerName: string, betAmount: number) {
    // // for testing
    // // eslint-disable-next-line no-constant-condition
    // if (true) {
    this.deck = Blackjack.createDeck();
    random.shuffle(this.deck);

    this.playerHands = [
      new Hand([this.deck.pop()!, this.deck.pop()!], playerName, betAmount),
    ];
    this.dealerHand = new Hand([this.deck.pop()!, this.deck.pop()!], "dealer");
    // } else {
    //   this.deck = [
    //     new Card("♠️", "6"), //
    //     new Card("♠️", "A"), //
    //     new Card("♠️", "2"), //
    //     new Card("♠️", "2"), //
    //     new Card("♠️", "2"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "8"), //
    //     new Card("♠️", "8"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //     new Card("♠️", "10"), //
    //   ];

    //   this.playerHands = [
    //     new Hand(
    //       [
    //         new Card("♠️", "10"), //
    //         new Card("♠️", "10"), //
    //       ],
    //       playerName,
    //       betAmount,
    //     ),
    //   ];
    //   this.dealerHand = new Hand(
    //     [
    //       new Card("♠️", "4"), //
    //       new Card("♠️", "5"), //
    //     ],
    //     "dealer",
    //   );
    // }

    this.statusMsg = `${this.playerHands[0].name}'s beurt.`;

    if (this.playerHands[0].hasBlackjack && !this.dealerHand.hasBlackjack) {
      this.setGameOver();
      return;
    }

    if (this.dealerHand.hasBlackjack && this.playerHands[0].hasBlackjack) {
      this.setGameOver();
      return;
    }
  }

  public get isPlayerTurn(): boolean {
    return this.playerHandIndex < this.playerHands.length;
  }

  public get currentHand(): Hand {
    if (!this.isPlayerTurn) throw new Error("not player turn");

    return this.playerHands[this.playerHandIndex]!;
  }

  public hit(): void {
    if (this.playerHandIndex > this.playerHands.length)
      throw new Error("No more hands");

    this.playerHands[this.playerHandIndex]!.cards.push(this.deck.pop()!);
    if (this.playerHands[this.playerHandIndex]!.value > 21) {
      this.nextHand();
    }
  }

  public stand(): void {
    this.nextHand();
  }

  public doubleDown(): void {
    if (!this.isPlayerTurn) throw new Error("Not player turn");

    const thisIndex = this.playerHandIndex;

    this.playerHands[thisIndex]!.betAmount *= 2;
    this.hit();
    if (this.playerHandIndex === thisIndex) {
      // if still on the same hand
      this.stand();
    }
  }

  private nextHand(): void {
    this.playerHandIndex++;
    if (this.playerHandIndex < this.playerHands.length) {
      if (this.currentHand.hasBlackjack) {
        this.nextHand();
      }
    } else {
      // dealer turn
      if (this.playerHands.every((hand) => hand.value > 21)) {
        // all hands bust, no need for the dealer to do anything
        this.setGameOver();
        return;
      }
    }
  }

  public split(): void {
    if (!this.currentHand.canSplit || this.currentHand.cards.length !== 2) {
      throw new Error(
        `Player cannot split hand: ${this.playerHands[0].toString()}`,
      );
    }

    const currHand = this.currentHand;
    const hand1 = new Hand(
      [currHand.cards[0], this.deck.pop()!],
      currHand.name,
      currHand.betAmount,
    );
    const hand2 = new Hand(
      [currHand.cards[1], this.deck.pop()!],
      currHand.name,
      currHand.betAmount,
    );

    this.playerHands[this.playerHandIndex] = hand1;
    this.playerHands.push(hand2);

    if (this.playerHands[this.playerHandIndex]!.hasBlackjack) {
      this.nextHand();
    }
  }

  public dealerTurn(): void {
    this.statusMsg = "Dealer's beurt.";

    if (this.dealerHand.value >= 17) {
      this.setGameOver();
      return;
    }

    this.dealerHand.cards.push(this.deck.pop()!);

    if (this.dealerHand.value >= 17) {
      this.setGameOver();
    }
  }

  private setGameOver(): void {
    this.isGameOver = true;
    this.setWinnings();

    if (this.winnings!.nettoWinnings < 0) {
      this.statusMsg = `${this.playerHands[0].name} heeft ${-this.winnings!
        .nettoWinnings} punten verloren!`;
      return;
    } else {
      this.statusMsg =
        this.winnings!.nettoWinnings > 0
          ? `${this.playerHands[0].name} heeft ${
              this.winnings!.nettoWinnings
            } punten gewonnen!`
          : "Dealer heeft gewonnen!";
    }
  }

  private setWinnings(): void {
    if (!this.isGameOver) this.winnings = undefined;

    let winnings = 0;

    const dealerValue = this.dealerHand.value;
    for (const hand of this.playerHands) {
      const handValue = hand.value;

      if (handValue > 21) {
        // player is bust
        continue;
      }

      if (this.dealerHand.hasBlackjack && !hand.hasBlackjack) {
        // dealer wins
        continue;
      }

      if (dealerValue > 21) {
        // dealer is bust
        winnings += hand.betAmount * 2;
      } else if (handValue > dealerValue) {
        // player hand wins
        winnings += hand.betAmount * 2;
      } else if (
        handValue === dealerValue ||
        (dealerValue > 21 && handValue > 21)
      ) {
        // tie
        if (
          (!this.dealerHand.hasBlackjack && !hand.hasBlackjack) ||
          (this.dealerHand.hasBlackjack && hand.hasBlackjack) ||
          handValue === dealerValue
        ) {
          // tie, give money back
          winnings += hand.betAmount;
        } else {
          if (hand.hasBlackjack) {
            // player wins
            winnings += hand.betAmount * 2;
          }
        }
      }
    }

    const totalBetAmount = this.playerHands.reduce(
      (acc, hand) => acc + hand.betAmount,
      0,
    );

    const nettoWinnings = winnings - totalBetAmount;

    this.winnings = { winnings, nettoWinnings };
  }

  /**
   * Errors if the game is not over
   */
  public getWinnings(): Winnings {
    if (!this.isGameOver) throw new Error("Game is not over");

    return this.winnings!;
  }

  private static createDeck(): Card[] {
    const cardNumbers = [];
    for (const value of Blackjack.values.keys()) {
      cardNumbers.push(value);
    }
    const suits = ["♥️", "♦️", "♣️", "♠️"];

    const deck: Card[] = [];
    for (const suit of suits) {
      for (const number of cardNumbers) {
        deck.push(new Card(suit, number));
      }
    }

    return deck;
  }
}

class Hand {
  public cards: [Card, Card, ...Card[]];

  public hasBlackjack: boolean;

  constructor(
    startingHand: [Card, Card],
    public name: string,
    public betAmount: number = -1,
  ) {
    this.cards = [startingHand[0], startingHand[1]];
    this.hasBlackjack = this.value === 21;
  }

  public get canSplit(): boolean {
    return this.canDoubleDown && this.cards[0].value === this.cards[1].value;
  }

  public get canDoubleDown(): boolean {
    return this.cards.length === 2;
  }

  public get value(): number {
    let total = 0;
    let numberOfAces = 0;
    for (const card of this.cards) {
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

  public toString(): string {
    return this.cards.map((card) => card.toString()).join(", ");
  }
}

class Card {
  public value: number;
  constructor(public suit: string, public number: string) {
    this.value = Blackjack.values.get(number)!;
  }

  public toString(): string {
    return this.number + this.suit;
  }
}
