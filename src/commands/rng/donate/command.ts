import { SlashCommandBuilder, userMention } from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import db from "../../../db/db";
import { autocompleteRngUsers } from "../../../utils/interaction";
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

  await interaction.reply(
    `${userMention(
      interaction.user.id,
    )} heeft ${amount} punten gedoneerd aan ${userMention(targetId)}.`,
  );
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  autocompleteRngUsers(interaction);
}
