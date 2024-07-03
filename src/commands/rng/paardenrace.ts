import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("paardenrace")
  .setDescription("Nerf Bartholomeus!1!!");

export async function execute(interaction: ChatInputCommandInteraction) {
  const paardenrace = new Paardenrace();

  await interaction.reply({ embeds: [paardenrace.createRaceEmbed()] });

  let winner: Paard | undefined = undefined;
  while (!winner) {
    winner = paardenrace.tick();
    await interaction.editReply({ embeds: [paardenrace.createRaceEmbed()] });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export class Paard {
  public progress = 0;

  constructor(
    public name: string,
    public bias: number,
    public probability: number,
  ) {}

  public toString(): string {
    return `🐴 ${this.name} | ${this.probability}`;
  }
}

export class Paardenrace {
  private static readonly s_Paarden: Paard[] = [
    new Paard("Leunie(Mike)", 1.01, 0.3199),
    new Paard("Rappe Riko", 1, 0.2845),
    new Paard("Trappelende Titus", 0.96, 0.1815),
    new Paard("Bartholomeus", 0.94, 0.1396),
    new Paard("Karel Galop", 0.9, 0.0746),
  ];

  private readonly globalSpeed = 0.1;

  private paarden: Paard[];

  constructor() {
    this.paarden = [];
    for (const paard of Paardenrace.s_Paarden) {
      this.paarden.push(new Paard(paard.name, paard.bias, paard.probability));
    }
  }

  static get paardenOmUitTeKiezen(): Paard[] {
    return this.s_Paarden;
  }

  public tick(): Paard | undefined {
    let winner: Paard | undefined;
    for (const paard of this.paarden) {
      paard.progress += Math.random() * paard.bias * this.globalSpeed;
      if (paard.progress >= 1) {
        winner = paard;
        break;
      }
    }

    this.sortPaarden();

    return winner;
  }

  public createRaceEmbed(): EmbedBuilder {
    let i = 1;
    return new EmbedBuilder()
      .setTitle("Paarden Race")
      .setColor("DarkGreen")
      .setFields(
        this.paarden.map((p) => ({
          name: i++ + " - " + p.toString(),
          value:
            Math.min(100, p.progress * 100).toFixed(1) +
            "%" +
            (p.progress >= 1 ? " 🏁" : ""),
        })),
      );
  }

  private sortPaarden(): void {
    this.paarden.sort((a, b) => b.progress - a.progress);
  }
}
