import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Paard, Paardenrace } from "./Paardenrace";

type User = {
  name: string;
  paard: Paard;
  amount: number;
  win: (amount: number) => void;
  loss: () => void;
  refund: () => void;
};

export class GameInteractionHandler {
  public started: boolean = false;
  public race: Paardenrace = new Paardenrace();
  private users: Map<string, User> = new Map();
  private winner: Paard | undefined;
  private winners: (
    | User & ({ hasWon: false } | { winnings: number; hasWon: true })
  )[] = [];

  constructor(
    private interaction: ChatInputCommandInteraction,
    public playersNeeded: number,
  ) {}

  public createJoinEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(`Paardenrace | ${this.users.size}/${this.playersNeeded}`)
      .setColor(this.everyoneJoined ? "Green" : "Blue")
      .setDescription(
        !this.started
          ? this.everyoneJoined
            ? "Race gaat starten!"
            : "Join de race!"
          : null,
      );

    const valueMaker = (player: User) => {
      let str = "";
      str += `- **Paard**: ${player.paard.toString()}\n`;
      str += `- **Inzet**: ${player.amount} punten\n`;
      str += `- **Payout**: ${this.getPayout(player)} punten`;
      return str;
    };

    const fields = [];
    for (const player of this.users.values()) {
      if (!player.amount && player.amount !== 0) continue;

      fields.push({
        name: `${player.name}`,
        value: valueMaker(player),
      });
    }
    embed.addFields(fields);

    return embed;
  }

  public createPayoutEmbed(): EmbedBuilder {
    if (!this.winner) {
      throw new Error("race is not finished.");
    }

    return new EmbedBuilder()
      .setTitle("Paardenrace")
      .setColor("Green")
      .setDescription(`${this.winner.toString(false)} heeft gewonnen!`)
      .setFields(
        this.winners.map((winner) => ({
          name: `${winner.hasWon ? "✅" : "❌"} ${winner.name}`,
          value: winner.hasWon
            ? `+${winner.winnings - winner.amount} punten`
            : `-${winner.amount} punten`,
        })),
      );
  }

  public async playGame(onDone?: () => void) {
    this.started = true;

    await this.interaction.editReply({
      embeds: [this.race.createRaceEmbed()],
      components: [],
    });

    this.winner = undefined;
    while (!this.winner) {
      this.winner = this.race.tick();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.interaction.editReply({
        embeds: [this.race.createRaceEmbed()],
        components: [],
      });
    }

    for (const user of this.users.values()) {
      if (!user.amount) continue;

      if (user.paard.name === this.winner.name) {
        const winnings = this.getPayout(user);
        user.win(winnings);
        this.winners.push({
          ...user,
          hasWon: true,
          winnings: winnings,
        });
      } else {
        this.winners.push({
          ...user,
          hasWon: false,
        });
        user.loss();
      }
    }

    await this.interaction.followUp({
      embeds: [this.createPayoutEmbed()],
    });

    onDone?.();
  }

  public getUsers(): (User & { userId: string })[] {
    const values = [];
    for (const [userId, user] of this.users.entries()) {
      values.push({ userId, ...user });
    }
    return values;
  }

  public hasUser(userId: string): boolean {
    return this.users.has(userId);
  }

  public removeUser(userId: string) {
    if (!this.hasUser(userId)) return;

    const user = this.users.get(userId)!;
    user.refund();
    this.users.delete(userId);
  }

  public async addUser(
    userId: string,
    username: string,
    paard: Paard,
    number: number,
    win: (amount: number) => void,
    loss: () => void,
    refund: () => void,
  ) {
    this.users.set(userId, {
      name: username,
      paard,
      amount: number,
      win,
      loss,
      refund,
    });
    await this.interaction.editReply({
      embeds: [this.createJoinEmbed()],
      components: this.everyoneJoined ? [] : undefined,
    });
  }

  get everyoneJoined(): boolean {
    return this.users.size === this.playersNeeded;
  }

  private getPayout(user: User): number {
    return Math.ceil(user.amount * (1 / user.paard.probability));
  }
}
