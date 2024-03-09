// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits } from "discord.js";
import { token } from "../config.json";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.username}`);
});

// Log in to Discord with your client's token
client.login(token);
