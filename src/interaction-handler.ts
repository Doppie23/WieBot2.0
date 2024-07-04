import { Interaction } from "discord.js";
import { Client } from ".";
import db from "./db/db";
import { onModalSubmit as paardenRaceOnModalSubmit } from "./commands/rng/paardenrace";

export default async function interactionHandler(
  client: Client,
  interaction: Interaction,
) {
  if (interaction.isChatInputCommand()) {
    if (interaction.guildId === undefined) {
      interaction.reply("Wat ga je mij prive lopen appen dan...?");
      return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    if (command.isRngCommand) {
      const user = db.getUser(interaction.user.id, interaction.guildId!);
      if (!user || user.rngScore === null) {
        await interaction.reply({
          content: "Je doet niet mee aan het RNG spel.",
          ephemeral: true,
        });
        return;
      }
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("[ERROR] " + error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "Er is iets grandioos fout gegaan...",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "Er is iets grandioos fout gegaan...",
          ephemeral: true,
        });
      }
    }
  } else if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `[ERROR] No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      if (!command.autocomplete)
        throw new Error("autocomplete is not defined in " + command.data.name);

      await command.autocomplete(interaction);
    } catch (error) {
      console.error(error);
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === "joinModal") {
      paardenRaceOnModalSubmit(interaction);
      return;
    }
    throw new Error("Unknown modal submit " + interaction.customId);
  }
}
