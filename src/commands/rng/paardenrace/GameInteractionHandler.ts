import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Paard, Paardenrace } from "./Paardenrace";

type User = { name: string; paard: Paard; amount: number };
type Winner = { id: string; winnings: number };

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
      .setDescription(this.everyoneJoined ? "Gaat starten!" : "Join de race!");

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

  public async playGame(onDone?: (winners: Winner[]) => void) {
    this.started = true;
    await this.interaction.editReply({
      embeds: [this.race.createRaceEmbed()],
      components: [],
    });
    let winner: Paard | undefined = undefined;
    while (!winner) {
      winner = this.race.tick();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.interaction.editReply({
        embeds: [this.race.createRaceEmbed()],
        components: [],
      });
    }

    const winners: Winner[] = [];
    for (const [userId, user] of this.users.entries()) {
      if (!user.amount) continue;

      if (user.paard.name === winner.name) {
        const winnings = Math.ceil(user.amount * (1 / winner.probability));
        winners.push({ id: userId, winnings });
      }
    }

    onDone?.(winners);
  }

  public getUsers(): (User & { userId: string })[] {
    const values = [];
    for (const [userId, user] of this.users.entries()) {
      values.push({ userId, ...user });
    }
    return values;
  }

  public addUser(
    userId: string,
    username: string,
    paard: Paard,
    number: number,
  ) {
    this.users.set(userId, { name: username, paard, amount: number });
    this.interaction.editReply({
      embeds: [this.createJoinEmbed()],
      components: this.everyoneJoined ? [] : undefined,
    });
  }

  get everyoneJoined(): boolean {
    return this.users.size === this.playersNeeded;
  }
}
