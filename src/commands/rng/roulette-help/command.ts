import {
  ButtonBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { createRouletteLinkButton } from "../roulette/command";

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
          "Je kan in roulette kiezen om meerdere bets tegelijk te plaatsen. Dit doe je met een bet-ID, die je maakt met behulp van de link hieronder. Daarnaast kan je bij het gebruik van /roulette ook kiezen uit standaard opties zoals 1-12, even, oneven, enzovoort. Als je klaar bent, kan je bij /roulette je bet-ID of je keuze uit de standaard opties meegeven. Als je voor een standaard optie kiest moet je ook een aantal punten opgeven. Als je gebruik maakt van een bet-ID hoef je alleen maar je bet-ID op te geven, niks anders.",
        ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        createRouletteLinkButton(),
      ),
    ],
  };
}
