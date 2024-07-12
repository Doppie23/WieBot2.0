import {
  ButtonStyle,
  ButtonBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ComponentType,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionResponse,
} from "discord.js";
import { createEmbed, spinRoulette } from "./roulette";
import rng from "../../../helpers/RngHelper";
import db from "../../../db/db";

export type Bet = {
  amount: number;
  pockets: number[];
};

export const data = new SlashCommandBuilder()
  .setName("roulette")
  .setDescription("rng certified");

export async function execute(interaction: ChatInputCommandInteraction) {
  const response = await interaction.reply({
    ephemeral: true,
    ...createInfoMessageComponents("bet-place-button"),
  });

  const bets = await waitForBets(response, interaction);
  if (!bets) return;

  const totalBetAmount = bets.reduce((acc, bet) => acc + bet.amount, 0);

  const user = db.users.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < totalBetAmount) {
    await interaction.editReply({
      content: "Daar heb je niet genoeg punten voor, probeer het opnieuw.",
      components: [],
      embeds: [],
    });
    return;
  }

  const outcome = spinRoulette(bets);

  rng.updateScore(interaction.user.id, interaction.guildId!, outcome.winnings);

  await interaction.deleteReply();
  await interaction.channel!.send({
    embeds: [
      createEmbed(totalBetAmount, outcome, interaction.user.displayName),
    ],
  });
}

async function waitForBets(
  response: InteractionResponse<boolean>,
  interaction: ChatInputCommandInteraction,
): Promise<Bet[] | undefined> {
  try {
    const confirmation = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 360_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    const modal = createModal("bet-id");

    await confirmation.showModal(modal);

    const modalResponse = await confirmation.awaitModalSubmit({
      time: 360_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    const betId = modalResponse.fields.getTextInputValue("bet-id");
    await modalResponse.deferUpdate();

    const bets = getBetFromId(betId);
    if (!bets) {
      await interaction.editReply({
        content: "Je Bet-ID is ongeldig, probeer het opnieuw.",
        components: [],
        embeds: [],
      });
      return;
    }

    return bets;
  } catch (error) {
    if ((error as { code?: string }).code === "InteractionCollectorError") {
      await interaction.editReply({
        content: "Je wachtte te lang met het invullen, probeer het opnieuw.",
        components: [],
        embeds: [],
      });
      return undefined;
    }

    // unknow error
    throw error;
  }
}

function getBetFromId(betId: string): Bet[] | undefined {
  try {
    const json = JSON.parse(betId) as unknown;

    if (
      json instanceof Array &&
      json.every(
        (bet) =>
          bet instanceof Object &&
          "amount" in bet &&
          "pockets" in bet &&
          typeof (bet as Bet).amount === "number" &&
          Array.isArray((bet as Bet).pockets) &&
          (bet as Bet).pockets.every((pocket) => typeof pocket === "number"),
      )
    ) {
      return json as Bet[];
    }
    throw new SyntaxError(`Invalid bet id ${betId}`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
}

function createModal(inputfieldId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId("bet-place-modal")
    .setTitle("Geef je Bet-ID op")
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(inputfieldId)
          .setLabel("Bet-ID")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true),
      ),
    );
}

function createInfoMessageComponents(buttonId: string) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Roulette")
        .setColor("Red")
        .setDescription(
          "Gebruik de link hieronder om je bet te plaatsen. Als je klaar bent kan je op 'Plaats bet!' klikken en je Bet-ID opgeven door deze in te vullen.",
        ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Link")
          .setStyle(ButtonStyle.Link)
          .setURL(
            "http://127.0.0.1:5500/src/commands/rng/roulette/public/index.html",
          ),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Plaats bet!")
          .setCustomId(buttonId)
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}
