import { AutocompleteInteraction, GuildMember, Interaction } from "discord.js";
import db from "../db/db";

export function getGuildMember(
  interaction: Interaction,
  userId: string,
): Promise<GuildMember> {
  if (!interaction.guild) throw new Error("Guild is undefined for interaction");

  const user = interaction.guild.members.cache.get(userId);
  if (user) return new Promise((resolve) => resolve(user));

  return interaction.guild.members.fetch(userId);
}

export async function autocompleteRngUsers(
  interaction: AutocompleteInteraction,
) {
  const focusedValue = interaction.options.getFocused();
  const users = db.getAllRngUsers(interaction.guildId!);

  const guildUsers: GuildMember[] = [];
  for (const user of users) {
    const guildUser = await getGuildMember(interaction, user.id);
    if (!guildUser || guildUser.id === interaction.user.id) continue;
    guildUsers.push(guildUser);
  }

  const filtered = guildUsers.filter((user) =>
    user.displayName.startsWith(focusedValue),
  );
  await interaction.respond(
    filtered.map((choice) => ({ name: choice.displayName, value: choice.id })),
  );
}
