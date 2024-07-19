import { GuildMember, Interaction } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export function getGuildMember(
  interaction: Interaction,
  userId: string,
): Promise<GuildMember> {
  if (!interaction.guild) throw new Error("Guild is undefined for interaction");

  const user = interaction.guild.members.cache.get(userId);
  if (user) return new Promise((resolve) => resolve(user));

  return interaction.guild.members.fetch(userId);
}

export function recFindFiles(filename: string = "command.ts", dir: string) {
  const filePaths: { name: string; path: string }[] = [];

  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      filePaths.push(...recFindFiles(filename, filePath));
    } else if (stat.isFile() && file === filename) {
      filePaths.push({ path: filePath, name: file });
    }
  });

  return filePaths;
}
