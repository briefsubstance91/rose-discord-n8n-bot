const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const allowedChannelName = 'rose-general';
  if (message.channel.name !== allowedChannelName) return;

  try {
    await fetch('https://briefsubstance.app.n8n.cloud/webhook/rose-general', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message.content,
        author: message.author.username,
        channel: message.channel.name,
        id: message.id,
        timestamp: message.createdTimestamp
      })
    });
    console.log(`✅ Forwarded message from ${message.author.username}`);
  } catch (err) {
    console.error('❌ Error forwarding to n8n:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
