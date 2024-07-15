import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  APIApplicationCommandOptionChoice,
} from "discord.js";
import { createEmbed, spinRoulette } from "./roulette";
import rng from "../../../helpers/RngHelper";
import db from "../../../db/db";
import { rouletteIdSiteURL } from "../../../../config.json";
import { simpleBets } from "./simpleBets";

if (!rouletteIdSiteURL || typeof rouletteIdSiteURL !== "string") {
  throw new Error(
    "rouletteIdSiteURL is not correct in config.json, it should be a string.",
  );
}

export type Bet = {
  amount: number;
  pockets: number[];
  name: string;
};

export const data = new rng.SlashCommandBuilder()
  .setName("roulette")
  .setDescription("rng certified")
  .addBetAmountOption({ name: "amount", required: false })
  .addStringOption((option) =>
    option
      .setName("bet")
      .setDescription("Waar zet je op in?")
      .addChoices(
        ...[...simpleBets.keys()].map(
          (name: string): APIApplicationCommandOptionChoice<string> => ({
            name: name,
            value: name,
          }),
        ),
      ),
  )
  .addIntegerOption((option) =>
    option
      .setName("getal")
      .setDescription(
        "Als je op een getal wil inzetten, geef je hier het getal.",
      )
      .setMinValue(0)
      .setMaxValue(36),
  )
  .addStringOption((option) =>
    option
      .setName("bet-id")
      .setDescription(
        "Zet op meer tegelijk in, `/roulette-help` voor meer info.",
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const amount = interaction.options.getInteger("amount");
  const bet = interaction.options.getString("bet");
  const getal = interaction.options.getInteger("getal");
  const betId = interaction.options.getString("bet-id");

  if (bet === null && betId === null) {
    await interaction.reply({
      content: "Je moet of een bet kiezen of een bet-id gebruiken.",
      ephemeral: true,
    });
    return;
  }

  if (betId !== null && (bet !== null || getal !== null || amount !== null)) {
    await interaction.reply({
      content:
        "Als je een bet-ID gebruikt kan je niet één van de andere opties gebruiken.",
      ephemeral: true,
    });
    return;
  }

  if (bet !== null) {
    if (!simpleBets.has(bet)) {
      console.error(`${bet} is not a valid bet`);
      await interaction.reply({
        content: "Je bet is ongeldig, probeer het opnieuw.",
        ephemeral: true,
      });
      return;
    }

    if (amount === null) {
      await interaction.reply({
        content: "Geef ook een aantal punten op.",
        ephemeral: true,
      });
      return;
    }
  }

  let bets: Bet[];
  if (betId) {
    const betsFromId = getBetFromId(betId);
    if (!betsFromId) {
      await interaction.reply({
        content: "Je Bet-ID is ongeldig, probeer het opnieuw.",
        ephemeral: true,
      });
      return;
    }

    bets = betsFromId;
  } else {
    let pockets: number[];

    let name = bet!;

    if (bet === "Getal") {
      if (getal === null || getal < 0 || getal > 36) {
        await interaction.reply({
          content: "Geef ook een getal op als je op een getal in wil zetten.",
          ephemeral: true,
        });
        return;
      }

      name += " " + getal;

      pockets = [getal];
    } else {
      pockets = simpleBets.get(bet!)!;
    }

    bets = [
      {
        amount: amount!,
        name: name,
        pockets,
      },
    ];
  }

  const totalBetAmount = bets.reduce((acc, bet) => acc + bet.amount, 0);

  const user = db.users.getUser(interaction.user.id, interaction.guildId!);
  if (user!.rngScore! < totalBetAmount) {
    await interaction.reply({
      content: "Daar heb je niet genoeg punten voor, probeer het opnieuw.",
      ephemeral: true,
    });
    return;
  }

  const outcome = spinRoulette(bets);

  rng.playInstantRngGame(
    interaction.user.id,
    interaction.guildId!,
    outcome.winnings,
    interaction,
  );

  await interaction.reply({
    embeds: [
      createEmbed(
        totalBetAmount,
        outcome,
        interaction.user.displayName,
        betId !== null ? betId : undefined,
      ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        createRouletteLinkButton(),
      ),
    ],
  });
}

export function createRouletteLinkButton() {
  return new ButtonBuilder()
    .setLabel("Bet-ID maken")
    .setStyle(ButtonStyle.Link)
    .setURL(rouletteIdSiteURL);
}

function getBetFromId(betId: string): Bet[] | undefined {
  try {
    const decoded = base64ToString(betId);

    const json = JSON.parse(decoded) as unknown;

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

function base64ToString(base64: string) {
  const binString = atob(base64);
  const bytes = Uint8Array.from(binString, (v) => v.codePointAt(0)!);
  return new TextDecoder().decode(bytes);
}
