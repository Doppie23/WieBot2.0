import { EmbedBuilder } from "discord.js";
import { LuckyWheel } from "./Luckywheel";

export function createEmbed(luckyWheel: LuckyWheel) {
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
