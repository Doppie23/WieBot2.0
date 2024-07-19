import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import db from "../../../db/db";
import {
  autocompleteRngUsers,
  getGuildMember,
} from "../../../utils/interaction";

/** maps name to delta time in ms */
const timeOptions = new Map<string, number>([
  ["afgelopen 7 dagen", 7 * 24 * 60 * 60 * 1000],
  ["afgelopen 30 dagen", 30 * 24 * 60 * 60 * 1000],
]);

export const data = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Zie alle statistieken van een speler.")
  .addStringOption((option) =>
    option.setName("target").setDescription("wie?").setAutocomplete(true),
  )
  .addStringOption((option) =>
    option
      .setName("periode")
      .setDescription("Welk periode wil je zien?")
      .addChoices(
        ...[...timeOptions.keys()].map((e) => ({
          name: e,
          value: e,
        })),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  let targetId = interaction.options.getString("target");
  if (!targetId) {
    targetId = interaction.user.id;
  }
  const timeFrame = interaction.options.getString("periode");

  const user = await getGuildMember(interaction, targetId);

  await interaction.reply({
    embeds: [
      createEmbed(
        user,
        timeFrame !== null && timeOptions.has(timeFrame)
          ? {
              name: timeFrame,
              startTime: Date.now() - timeOptions.get(timeFrame)!,
            }
          : null,
      ),
    ],
    fetchReply: true,
  });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  await autocompleteRngUsers(interaction);
}

function createEmbed(
  user: GuildMember,
  timeOptions: {
    name: string;
    startTime: number;
  } | null = null,
) {
  const params = [
    user.id,
    user.guild.id,
    timeOptions ? timeOptions.startTime : null,
    null,
  ] as const;

  const biggestWin = db.rngRecords.getBiggestWin(...params);
  const biggestLoss = db.rngRecords.getBiggestLoss(...params);
  const totalWins = db.rngRecords.getTotalWins(...params);
  const totalLosses = db.rngRecords.getTotalLosses(...params);
  const mostProfitable = db.rngRecords.getMostProfitableGame(...params);
  const lastFiveGames = db.rngRecords.getLastRecords(...params, 5);
  const favoriteGame = db.rngRecords.getFavoriteGame(...params);

  return new EmbedBuilder()
    .setTitle("Stats")
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      `Statistieken voor ${user.displayName}` +
        (timeOptions ? ` van **${timeOptions.name}**.` : "."),
    )
    .setColor("Random")
    .setFields(
      [
        totalWins !== undefined && totalLosses !== undefined
          ? {
              name: "✨ Record",
              value: `${totalWins.wins} W | ${totalLosses.losses} L`,
              inline: false,
            }
          : undefined,
        biggestWin !== undefined
          ? {
              name: "💰 Grootste win",
              value: `${biggestWin.amount} punten (${biggestWin.commandName})`,
              inline: true,
            }
          : undefined,
        biggestLoss !== undefined
          ? {
              name: "📉 Grootste verlies",
              value: `${biggestLoss.amount} punten (${biggestLoss.commandName})`,
              inline: true,
            }
          : undefined,
        mostProfitable !== undefined
          ? {
              name: "😎 Meest winstgevende spel",
              value: `${mostProfitable.commandName} (${mostProfitable.profit} punten)`,
              inline: true,
            }
          : undefined,
        favoriteGame !== undefined
          ? {
              name: "🎈 Favoriete spel",
              value: `${favoriteGame.commandName} (${favoriteGame.usageCount}x gespeeld)`,
              inline: true,
            }
          : undefined,
        lastFiveGames.length > 0
          ? {
              name: "⏰ Laatste 5 bets",
              value: `${lastFiveGames
                .reverse()
                .map((e) => (e.isWin ? `+${e.amount} ✅` : `-${e.amount} ❌`))
                .join(", ")}`,
              inline: false,
            }
          : undefined,
      ].filter((e) => e !== undefined),
    );
}
