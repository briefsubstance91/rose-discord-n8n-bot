import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const webhookUrl = process.env.N8N_WEBHOOK_URL;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.once('ready', () => {
  console.log(`🤖 Rose bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const payload = {
    user: message.author.username,
    content: message.content,
    channel: message.channel.name || message.channel.id,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      if (data.reply) {
        await message.reply(data.reply);
      } else {
        await message.reply("🪻 Rose received the message, but didn’t send a reply.");
      }
    } catch (err) {
      console.error("❌ Response was not valid JSON:", text);
      await message.reply("⚠️ Rose received a response, but it wasn’t valid.");
    }

  } catch (error) {
    console.error("❌ Error sending to n8n webhook:", error);
    await message.reply("⚠️ Sorry, something went wrong connecting to Rose.");
  }
});

client.login(token);
