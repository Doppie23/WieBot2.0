import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";

const choices = [
  { name: "Crab Rave", value: "crabRave" },
  { name: "Epic Outro", value: "epicOutro" },
  { name: "Royalistiq", value: "royalistiq" },
];

export const data = new SlashCommandBuilder()
  .setName("outro")
  .setDescription("Epic outro")
  .addStringOption((option) =>
    option
      .setName("choices")
      .setDescription("test")
      .setRequired(true)
      .addChoices(...choices),
  );

export async function execute(interaction: CommandInteraction) {
  const choice = interaction.options.get("choices")?.value;

  if (
    !(choices.some((e) => e.value === choice) && typeof choice === "string")
  ) {
    console.warn(
      `[ERROR] User (${interaction.user.displayName}) picked choice should not be possible: ${choice} from ${choices}`,
    );
    await interaction.reply({
      content: "You did something that should not be possible :'(",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply(choice);
}
