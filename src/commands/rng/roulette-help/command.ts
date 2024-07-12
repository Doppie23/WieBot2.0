import {
  ButtonStyle,
  ButtonBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { rouletteIdSiteURL } from "../../../../config.json";

if (!rouletteIdSiteURL || typeof rouletteIdSiteURL !== "string") {
  throw new Error(
    "rouletteIdSiteURL is not correct in config.json, it should be a string.",
  );
}

export const data = new SlashCommandBuilder()
  .setName("roulette-help")
  .setDescription("HELP!");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply({
    ...createInfoMessageComponents(),
  });
}

function createInfoMessageComponents() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Roulette help")
        .setColor("Red")
        .setDescription(
          "Om een bet in roulette te plaatsen moet je een bet-ID maken met behulp van de link hieronder. Als je klaar bent kan je bij `/roulette` je ID meegeven door deze in te vullen.",
        ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Link")
          .setStyle(ButtonStyle.Link)
          .setURL(rouletteIdSiteURL as string),
      ),
    ],
  };
}
