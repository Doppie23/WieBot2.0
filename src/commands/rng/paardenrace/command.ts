import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import db from "../../../db/db";
import rng from "../../../helpers/RngHelper";
import { GameInteractionHandler } from "./GameInteractionHandler";

/**
 * Holds the guildId's of all active games.
 */
const activeGames: Set<string> = new Set();

export const data = new SlashCommandBuilder()
  .setName("paardenrace")
  .setDescription("Nerf Bartholomeus!1!!");

export async function execute(interaction: ChatInputCommandInteraction) {
  if (activeGames.has(interaction.guildId!)) {
    await interaction.reply({
      content: "Er is al een paardenrace bezig!",
      ephemeral: true,
    });
    return;
  }

  const game = new GameInteractionHandler(
    interaction,
    db.users.getAllRngUsers(interaction.guildId!).length,
  );

  activeGames.add(interaction.guildId!);

  const select = new StringSelectMenuBuilder()
    .setCustomId("paard")
    .setPlaceholder("Kies een paard!")
    .addOptions(
      game.race.paardenOmUitTeKiezen.map((paard) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(paard.toString())
          .setDescription(paard.description)
          .setValue(paard.name),
      ),
    )
    .setMinValues(1)
    .setMaxValues(1);

  const response = await interaction.reply({
    embeds: [game.createJoinEmbed()],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    ],
  });

  const paardCollector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 180_000,
  });

  paardCollector.on("end", async () => {
    if (!game.started) {
      activeGames.delete(interaction.guildId!);
      await interaction.deleteReply();

      // refund users
      game.getUsers().forEach((user) => user.refund());
    }
  });

  paardCollector.on("collect", async (i) => {
    if (!db.users.isRngUser(i.user.id, interaction.guildId!)) {
      await i.reply({ content: "Je kan niet meedoen!", ephemeral: true });
      return;
    }

    if (!i.values[0]) return;

    const paard = game.race.getPaardByName(i.values[0]);
    if (!paard) {
      await i.reply({
        content: "Dat paard bestaat niet!",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("joinModal")
      .setTitle("Join Paardenrace")
      .setComponents([
        new ActionRowBuilder<TextInputBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId("amount")
            .setLabel("Aantal Punten:")
            .setStyle(TextInputStyle.Short),
        ]),
      ]);

    await i.showModal(modal);

    i.awaitModalSubmit({
      time: 60_000,
      filter: (mi) => mi.customId === "joinModal" && mi.user.id === i.user.id,
    })
      .then(async (mInteraction) => {
        const amount = await getInputFromModal(mInteraction, game);
        if (!amount) return;

        if (game.hasUser(i.user.id)) {
          game.removeUser(i.user.id);
        }

        const { win, loss, refund } = rng.placeBet(
          mInteraction.user.id,
          mInteraction.guildId!,
          amount,
          interaction,
        );
        await game.addUser(
          i.user.id,
          i.user.displayName,
          paard,
          amount,
          win,
          loss,
          refund,
        );

        await mInteraction.deferUpdate();

        if (game.everyoneJoined) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await game.playGame(() => {
            activeGames.delete(mInteraction.guildId!);
          });
        }
      })
      .catch(() => undefined);
  });
}

async function getInputFromModal(
  interaction: ModalSubmitInteraction,
  game: GameInteractionHandler,
): Promise<number | undefined> {
  const dbUser = db.users.getUser(interaction.user.id, interaction.guildId!);
  if (!dbUser || (!dbUser.rngScore && dbUser.rngScore !== 0)) {
    await interaction.reply({
      content: "Je kan niet meedoen!",
      ephemeral: true,
    });
    return;
  }

  const strAmount = interaction.fields.getTextInputValue("amount");
  const amount = parseInt(strAmount);
  if (!strAmount || isNaN(amount) || amount < 0) {
    await interaction.reply({
      content: "Je moet een geldig aantal punten invullen!",
      ephemeral: true,
    });
    return;
  }

  if (dbUser.rngScore < amount) {
    await interaction.reply({
      content: "Je hebt te weinig punten!",
      ephemeral: true,
    });
    return;
  }

  if (!activeGames.has(interaction.guildId!)) {
    await interaction.reply({
      content: "Er is geen paardenrace bezig!",
      ephemeral: true,
    });
    return;
  }

  if (game.started) {
    await interaction.reply({
      content: "De race is al gestart!",
      ephemeral: true,
    });
    return;
  }

  return amount;
}
