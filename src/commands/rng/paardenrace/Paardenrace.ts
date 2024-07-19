import { EmbedBuilder } from "discord.js";

export class Paard {
  public progress = 0;

  constructor(
    public name: string,
    public description: string,
    public bias: number,
    public probability: number,
  ) {}

  public toString(showProbability: boolean = true): string {
    return `🐴 ${this.name}${showProbability ? ` | ${this.probability}` : ""}`;
  }
}

export class Paardenrace {
  private readonly paarden = [
    new Paard("Leunie(Mike)", "Een echte zakenman.", 1.01, 0.3199),
    new Paard(
      "Rappe Riko",
      '"To be Rap or not to be Rap, that is the question!" - Rappe Riko',
      1,
      0.2845,
    ),
    new Paard(
      "Trappelende Titus",
      "Trappelende Titus is money glitch.",
      0.96,
      0.1815,
    ),
    new Paard("Bartholomeus", "META!", 0.94, 0.1396),
    new Paard("Karel Galop", "De onderhond.", 0.9, 0.0746),
  ];

  private readonly globalSpeed = 0.1;

  public get paardenOmUitTeKiezen(): Paard[] {
    return this.paarden;
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

  public getPaardByName(name: string): Paard | undefined {
    return this.paarden.find((paard) => paard.name === name);
  }

  public createRaceEmbed(): EmbedBuilder {
    let i = 1;
    return new EmbedBuilder()
      .setTitle("Paardenrace")
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
