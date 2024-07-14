import random from "../utils/random";

export class Deck {
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
  public static readonly suits = ["♥️", "♦️", "♣️", "♠️"] as const;

  protected deck: Card[];
  protected length;

  constructor() {
    this.deck = this.createDeck();
    random.shuffle(this.deck);
    this.length = this.deck.length;
  }

  public pop(): Card {
    if (this.length === 0) {
      random.shuffle(this.deck);
      this.length = this.deck.length;
    }
    return this.deck[--this.length]!;
  }

  private createDeck(): Card[] {
    const cardNumbers = [];
    for (const value of Deck.values.keys()) {
      cardNumbers.push(value);
    }

    const deck: Card[] = [];
    for (const suit of Deck.suits) {
      for (const number of cardNumbers) {
        deck.push(new Card(suit, number));
      }
    }

    return deck;
  }
}

export class TestDeck extends Deck {
  /**
   * Useful for testing
   *
   * Cards will be dealt from first to last
   */
  constructor(deck: Card[]) {
    super();
    this.deck = deck.reverse();
    this.length = this.deck.length;
  }

  public pop(): Card {
    if (this.length === 0) {
      this.length = this.deck.length;
    }
    return this.deck[--this.length]!;
  }
}

export class Card {
  /** The value of the card */
  public value: number;

  constructor(
    /** The suit the card is part of */
    public suit: (typeof Deck.suits)[number],
    /** The number of the card, so 2, 3, J, Q, K etc. */
    public number: string,
  ) {
    const value = Deck.values.get(number);
    if (value === undefined) {
      throw new Error("Invalid card");
    }

    this.value = value;
  }

  public toString(): string {
    return this.number + this.suit;
  }
}
