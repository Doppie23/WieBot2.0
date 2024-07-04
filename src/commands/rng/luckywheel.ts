import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import random from "../../utils/random";
import db from "../../db/db";

export const timeout = 12 * 60 * 60; // 12 hours

export const data = new SlashCommandBuilder()
  .setName("luckywheel")
  .setDescription("Altijd prijs!!!");

export async function execute(interaction: ChatInputCommandInteraction) {
  const luckyWheel = new LuckyWheel();

  await interaction.reply({ embeds: [createEmbed(luckyWheel)] });
  let sleepTime = 0.1;
  for (let i = 0; i < 12; i++) {
    await new Promise((resolve) => setTimeout(resolve, sleepTime * 1000));
    luckyWheel.rollOneStep();
    await interaction.editReply({ embeds: [createEmbed(luckyWheel)] });
    sleepTime += 0.05;
  }

  await new Promise((resolve) => setTimeout(resolve, sleepTime * 1000));

  const score = luckyWheel.currentOptions[1]!;

  db.users.updateRngScore(interaction.user.id, interaction.guildId!, score);

  await interaction.followUp(`Je hebt ${score} punten gewonnen.`);
}

function createEmbed(luckyWheel: LuckyWheel) {
  return new EmbedBuilder()
    .setTitle("Lucky Wheel")
    .setColor("Blue")
    .setFields([
      {
        name: luckyWheel.currentOptions[0]?.toString()!,
        value: "🔹",
        inline: true,
      },
      {
        name: luckyWheel.currentOptions[1]?.toString()!,
        value: "⬆",
        inline: true,
      },
      {
        name: luckyWheel.currentOptions[2]?.toString()!,
        value: "🔹",
        inline: true,
      },
    ]);
}

class LuckyWheel {
  private readonly options: number[];
  private bigWinAvailable: boolean = true;

  constructor() {
    this.options = this.createRandomOptionsArray(3);
  }

  private createRandomOptionsArray(size: number): number[] {
    const options = [];
    for (let i = 0; i < size; i++) {
      options.push(this.getRandomOption());
    }
    return options;
  }

  private getRandomOption(): number {
    if (this.bigWinAvailable) {
      const bigWin = random.choices([false, true], [9, 1]);
      if (bigWin) {
        this.bigWinAvailable = false;
        return 5000;
      }
    }

    const option = random.randrange(5, 100);
    const positive = random.choices([true, false], [9, 1]);
    return option * (positive ? 1 : -1);
  }

  get currentOptions() {
    return this.options;
  }

  public rollOneStep() {
    this.options.pop();
    this.options.unshift(this.getRandomOption());
  }
}
