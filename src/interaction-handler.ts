import { Interaction } from "discord.js";
import { Client } from ".";
import db from "./db/db";

export default async function interactionHandler(
  client: Client,
  interaction: Interaction,
) {
  if (interaction.isChatInputCommand()) {
    if (interaction.guildId === undefined) {
      interaction.reply("Interactions are only available in guilds");
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
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  } else if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
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
  }
}
