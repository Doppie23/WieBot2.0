import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import db from "../../../db/db";
import {
  autocompleteRngUsers,
  getGuildMember,
} from "../../../utils/interaction";
import { getBetAmount } from "../../../utils/rngUtils";

export const data = new SlashCommandBuilder()
  .setName("donate")
  .setDescription("Doneer punten aan iemand anders")
  .addStringOption((option) =>
    option
      .setName("target")
      .setDescription("wie?")
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Hoeveel punten wil je doneren?")
      .setMinValue(1)
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = await getBetAmount(interaction);
  if (amount === undefined) return;

  const targetId = interaction.options.getString("target")!;

  const target = db.users.getUser(targetId, interaction.guildId!);

  if (!target) throw new Error("user or target is undefined");

  db.users.donate(interaction.user.id, targetId, interaction.guildId!, amount);

  await interaction.reply({
    embeds: [
      createEmbed(
        interaction.user.displayName,
        (
          await getGuildMember(interaction, targetId)
        ).displayName,
        amount,
      ),
    ],
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  await autocompleteRngUsers(interaction);
}

function createEmbed(
  userName: string,
  targetName: string,
  amount: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("Doneer")
    .setDescription(`${userName} heeft gedoneerd aan ${targetName}.`)
    .setColor("Blue")
    .addFields(
      {
        name: `📤 ${userName}`,
        value: `-${amount} punten`,
      },
      {
        name: `📥 ${targetName}`,
        value: `+${amount} punten`,
      },
    );
}
