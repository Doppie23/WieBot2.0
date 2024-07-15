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
            ? "Gaat starten!"
            : "Join de race!"
          : null,
      );

    const fields = [];
    for (const player of this.users.values()) {
      if (!player.amount && player.amount !== 0) continue;

      fields.push({
        name: `${player.name} | ${player.amount} punten`,
        value: player.paard.toString(),
      });
    }
    embed.addFields(fields);

    return embed;
  }

  public async playGame(onDone?: () => void) {
    this.started = true;

    await this.interaction.editReply({
      embeds: [this.createJoinEmbed()],
      components: [],
    });
    const response = await this.interaction.followUp({
      embeds: [this.race.createRaceEmbed()],
      components: [],
    });

    let winner: Paard | undefined = undefined;
    while (!winner) {
      winner = this.race.tick();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await response.edit({
        embeds: [this.race.createRaceEmbed()],
        components: [],
      });
    }

    for (const user of this.users.values()) {
      if (!user.amount) continue;

      if (user.paard.name === winner.name) {
        const winnings = Math.ceil(user.amount * (1 / winner.probability));
        user.win(winnings);
      } else {
        user.loss();
      }
    }

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
}
