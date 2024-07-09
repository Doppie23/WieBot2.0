import { Interaction } from "discord.js";
import { Client, isProduction } from ".";
import db from "./db/db";

export default async function interactionHandler(
  client: Client,
  interaction: Interaction,
) {
  if (interaction.isChatInputCommand()) {
    if (interaction.guildId === undefined) {
      await interaction.reply("Wat ga je mij prive lopen appen dan...?");
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
      const user = db.users.getUser(interaction.user.id, interaction.guildId!);
      if (!user || user.rngScore === null) {
        await interaction.reply({
          content: "Je doet niet mee aan het RNG spel.",
          ephemeral: true,
        });
        return;
      }
    }

    if (command.timeout && isProduction) {
      const timeRemaining = db.timeouts.timeRemaining(
        interaction.user.id,
        interaction.guildId!,
        interaction.commandName,
      );

      if (timeRemaining > 0) {
        await interaction.reply({
          content: `Je moet nog ${Math.ceil(
            timeRemaining / 1000,
          )} seconden wachten voordat je dit commando weer kan gebruiken.`,
          ephemeral: true,
        });
        return;
      }

      db.timeouts.addTimeout(
        interaction.user.id,
        interaction.guildId!,
        interaction.commandName,
        command.timeout,
      );
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[ERROR] in interaction ${interaction.commandName}`, error);
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
      console.error(
        `[ERROR] Error in autocomplete ${interaction.commandName}`,
        error,
      );
    }
  }
}
