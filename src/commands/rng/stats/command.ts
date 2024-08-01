import { EmbedBuilder } from "discord.js";
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import db from "../../../db/db";
import { getGuildMember } from "../../../utils/interaction";
import rng from "../../../helpers/RngHelper";

/** maps name to delta time in ms */
const timeOptions = new Map<string, number>([
  ["afgelopen uur", 60 * 60 * 1000],
  ["afgelopen 24 uur", 24 * 60 * 60 * 1000],
  ["afgelopen 7 dagen", 7 * 24 * 60 * 60 * 1000],
  ["afgelopen 30 dagen", 30 * 24 * 60 * 60 * 1000],
]);

export const data = new rng.SlashCommandBuilder()
  .setName("stats")
  .setDescription("Zie alle statistieken van een speler.")
  .addTargetOption({
    name: "wie",
    description: "Van wie wil je de statistieken zien?",
    required: false,
  })
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
  let targetId = interaction.options.getString("wie");
  if (!targetId) {
    targetId = interaction.user.id;
  }
  const timeFrame = interaction.options.getString("periode");
  let validTimeFrame = false;
  if (timeFrame !== null) {
    if (timeOptions.has(timeFrame)) {
      validTimeFrame = true;
    } else {
      throw new Error(`${timeFrame} is not a valid time frame!`);
    }
  }

  const user = await getGuildMember(interaction, targetId);

  await interaction.reply({
    embeds: [
      createEmbed(
        user,
        timeFrame !== null && validTimeFrame
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
  await rng.SlashCommandBuilder.autocomplete(interaction);
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

  const currentScore = db.users.getUser(user.id, user.guild.id)!.rngScore!;

  const biggestWin = db.rngRecords.getBiggestWin(...params);
  const biggestLoss = db.rngRecords.getBiggestLoss(...params);
  const totalWins = db.rngRecords.getTotalWins(...params);
  const totalLosses = db.rngRecords.getTotalLosses(...params);
  const mostProfitable = db.rngRecords.getMostProfitableGame(...params);
  const lastFiveGames = db.rngRecords.getLastRecords(...params, 5);
  const favoriteGame = db.rngRecords.getFavoriteGame(...params);
  const profit = db.rngRecords.getProfit(...params);

  return new EmbedBuilder()
    .setTitle("Stats" + (timeOptions ? ` | ${timeOptions.name}` : ""))
    .setThumbnail(user.displayAvatarURL())
    .setDescription(`Statistieken voor ${user.displayName}.`)
    .setColor("Random")
    .setFields(
      [
        currentScore !== undefined
          ? {
              name: "🎲 Huidige score",
              value: `${currentScore} punten`,
              inline: false,
            }
          : undefined,
        profit !== undefined
          ? {
              name: `${profit.profit > 0 ? "🟢" : "🔴"} Totale winst`,
              value: `${profit.profit} punten`,
              inline: false,
            }
          : undefined,
        totalWins !== undefined && totalLosses !== undefined
          ? {
              name: "✨ Record",
              value: `${totalWins.wins} W | ${totalLosses.losses} L`,
              inline: false,
            }
          : undefined,
        biggestWin !== undefined
          ? {
              name: "💹 Grootste winst",
              value: `${biggestWin.amount} punten (${biggestWin.commandName})`,
              inline: false,
            }
          : undefined,
        biggestLoss !== undefined
          ? {
              name: "📉 Grootste verlies",
              value: `${biggestLoss.amount} punten (${biggestLoss.commandName})`,
              inline: false,
            }
          : undefined,
        mostProfitable !== undefined
          ? {
              name: "😎 Meest winstgevende spel",
              value: `${mostProfitable.commandName} (${mostProfitable.profit} punten)`,
              inline: false,
            }
          : undefined,
        favoriteGame !== undefined
          ? {
              name: "🎈 Favoriete spel",
              value: `${favoriteGame.commandName} (${favoriteGame.usageCount}x gespeeld)`,
              inline: false,
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
