import { SlashCommandBuilder, userMention } from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import db from "../../db/db";
import { autocompleteRngUsers } from "../../utils/interaction";

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
      .setDescription("hoeveel?")
      .setMinValue(1)
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetId = interaction.options.getString("target")!;
  const amount = interaction.options.getInteger("amount")!;

  const user = db.users.getUser(interaction.user.id, interaction.guildId!);
  const target = db.users.getUser(targetId, interaction.guildId!);

  if (!target || !user) throw new Error("user or target is undefined");

  if (user.rngScore! < amount) {
    await interaction.reply({
      content: "Zo rijk ben je nou ook weer niet.",
      ephemeral: true,
    });
    return;
  }

  db.users.donate(user.id, targetId, interaction.guildId!, amount);

  await interaction.reply(
    `${userMention(
      interaction.user.id,
    )} heeft ${amount} punten gedoneerd aan ${userMention(targetId)}.`,
  );
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  autocompleteRngUsers(interaction);
}
