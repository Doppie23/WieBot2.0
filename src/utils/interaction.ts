import { GuildMember, Interaction } from "discord.js";

export function getGuildMember(
  interaction: Interaction,
  userId: string,
): Promise<GuildMember> {
  if (!interaction.guild) throw new Error("Guild is undefined for interaction");

  const user = interaction.guild.members.cache.get(userId);
  if (user) return new Promise((resolve) => resolve(user));

  return interaction.guild.members.fetch(userId);
}
