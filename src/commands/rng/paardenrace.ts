import {
  SlashCommandBuilder,
  EmbedBuilder,
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
import db from "../../db/db";

type User = { name: string; paard: Paard; amount?: number };

type Game = {
  started: boolean;
  interaction: ChatInputCommandInteraction;
  race: Paardenrace;
  users: Map<string, User>;
  playersNeeded: number;
};

const games = new Map<string, Game>();

export const data = new SlashCommandBuilder()
  .setName("paardenrace")
  .setDescription("Nerf Bartholomeus!1!!");

export async function execute(interaction: ChatInputCommandInteraction) {
  const goingGame = games.get(interaction.guildId!);
  if (goingGame) {
    await interaction.reply({
      content: "Er is al een paardenrace bezig!",
      ephemeral: true,
    });
    return;
  }

  const paardenrace = new Paardenrace();

  const game: Game = {
    started: false,
    interaction,
    race: paardenrace,
    users: new Map(),
    playersNeeded: db.getAllRngUsers(interaction.guildId!).length,
  };

  games.set(interaction.guildId!, game);

  const select = new StringSelectMenuBuilder()
    .setCustomId("paard")
    .setPlaceholder("Kies een paard!")
    .addOptions(
      paardenrace.paardenOmUitTeKiezen.map((paard) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(paard.toString())
          .setDescription(paard.description)
          .setValue(paard.name),
      ),
    )
    .setMinValues(1)
    .setMaxValues(1);

  const response = await interaction.reply({
    embeds: [createJoinEmbed(game)],
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    ],
  });

  const paardCollector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 180_000,
  });
  setTimeout(() => {
    if (!game.started) {
      games.delete(interaction.guildId!);
      interaction.deleteReply();
    }
  }, 180_000);

  paardCollector.on("collect", async (i) => {
    if (!db.isRngUser(i.user.id, interaction.guildId!)) {
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

    game.users.set(i.user.id, {
      name: i.user.displayName,
      paard: paard,
      amount: undefined,
    });

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

    i.showModal(modal);
  });
}

export async function onModalSubmit(interaction: ModalSubmitInteraction) {
  const strAmount = interaction.fields.getTextInputValue("amount");
  const amount = parseInt(strAmount);
  if (!strAmount || isNaN(amount) || amount < 0) {
    await interaction.reply({
      content: "Je moet een geldig aantal punten invullen!",
      ephemeral: true,
    });
    return;
  }

  const dbUser = db.getUser(interaction.user.id, interaction.guildId!);
  if (!dbUser || !dbUser.rngScore) {
    await interaction.reply({
      content: "Je kan niet meedoen!",
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

  const game = games.get(interaction.guildId!);
  if (!game) {
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

  const user = game.users.get(interaction.user.id);
  if (!user) {
    await interaction.reply({
      content: "Je moet eerst een paard kiezen!",
      ephemeral: true,
    });
    return;
  }

  user.amount = amount;

  const gameCanStart = game.users.size === game.playersNeeded;

  await game.interaction.editReply({
    embeds: [createJoinEmbed(game, gameCanStart)],
  });
  await interaction.deferUpdate();

  if (gameCanStart) {
    game.started = true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    startGame(game, interaction.guildId!);
  }
}

async function startGame(game: Game, guilId: string) {
  game.started = true;
  await game.interaction.editReply({
    embeds: [game.race.createRaceEmbed()],
    components: [],
  });
  let winner: Paard | undefined = undefined;
  while (!winner) {
    winner = game.race.tick();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await game.interaction.editReply({
      embeds: [game.race.createRaceEmbed()],
      components: [],
    });
  }

  for (const [userId, user] of game.users.entries()) {
    if (!user.amount) continue;

    if (user.paard.name === winner.name) {
      const winnings = user.amount * (1 / winner.probability) - user.amount;

      db.updateRngScore(userId, guilId, winnings);
    } else {
      db.updateRngScore(userId, guilId, -user.amount);
    }
  }

  games.delete(game.interaction.guildId!);
}

function createJoinEmbed(game: Game, starting = false): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Paardenrace | ${game.users.size}/${game.playersNeeded}`)
    .setColor(starting ? "Green" : "Blue")
    .setDescription(starting ? "Gaat starten!" : "Join de race!");

  const fields = [];
  for (const player of game.users.values()) {
    if (!player.amount && player.amount !== 0) continue;

    fields.push({
      name: `${player.name} | ${player.amount} punten`,
      value: player.paard.toString(),
    });
  }
  embed.addFields(fields);

  return embed;
}

export class Paard {
  public progress = 0;

  constructor(
    public name: string,
    public description: string,
    public bias: number,
    public probability: number,
  ) {}

  public toString(): string {
    return `🐴 ${this.name} | ${this.probability}`;
  }
}

export class Paardenrace {
  private readonly paarden = [
    new Paard("Leunie(Mike)", "Een echte zakenman.", 1.01, 0.3199),
    new Paard(
      "Rappe Riko",
      '"To be Rap or not to be Rap, that is the question!" - Rappe Riko',
      1,
      0.2845,
    ),
    new Paard(
      "Trappelende Titus",
      "Trappelende Titus is money glitch.",
      0.96,
      0.1815,
    ),
    new Paard("Bartholomeus", "META!", 0.94, 0.1396),
    new Paard("Karel Galop", "De onderhond.", 0.9, 0.0746),
  ];

  private readonly globalSpeed = 0.1;

  public get paardenOmUitTeKiezen(): Paard[] {
    return this.paarden;
  }

  public tick(): Paard | undefined {
    let winner: Paard | undefined;
    for (const paard of this.paarden) {
      paard.progress += Math.random() * paard.bias * this.globalSpeed;
      if (paard.progress >= 1) {
        winner = paard;
        break;
      }
    }

    this.sortPaarden();

    return winner;
  }

  public getPaardByName(name: string): Paard | undefined {
    return this.paarden.find((paard) => paard.name === name);
  }

  public createRaceEmbed(): EmbedBuilder {
    let i = 1;
    return new EmbedBuilder()
      .setTitle("Paardenrace")
      .setColor("DarkGreen")
      .setFields(
        this.paarden.map((p) => ({
          name: i++ + " - " + p.toString(),
          value:
            Math.min(100, p.progress * 100).toFixed(1) +
            "%" +
            (p.progress >= 1 ? " 🏁" : ""),
        })),
      );
  }

  private sortPaarden(): void {
    this.paarden.sort((a, b) => b.progress - a.progress);
  }
}
