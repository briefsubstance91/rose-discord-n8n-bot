// index.js
import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;
const assistantId = process.env.ASSISTANT_ID;
const n8nWebhookUrl = "https://briefsubstance.app.n8n.cloud/webhook/rose-discord";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// In-memory storage of user thread IDs (upgrade to persistent DB later)
const userThreads = {};

client.once('ready', () => {
  console.log(`🤖 Rose bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  console.log(`📨 Message from ${message.author.username}: ${message.content}`); // Debug line

  const userId = message.author.id;
  const userMessage = message.content;

  try {
    let threadId = userThreads[userId];

    // 1. Create new thread if it doesn't exist
    if (!threadId) {
      const threadRes = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'OpenAI-Beta': 'assistants=v1',
          'Content-Type': 'application/json'
        }
      });
      const threadData = await threadRes.json();
      threadId = threadData.id;
      userThreads[userId] = threadId;
      console.log(`🧵 Created thread for ${message.author.username}: ${threadId}`);
    }

    // 2. Add user message to thread
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'OpenAI-Beta': 'assistants=v1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });

    // 3. Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'OpenAI-Beta': 'assistants=v1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assistant_id: assistantId })
    });
    const runData = await runRes.json();

    // 4. Poll for run status
    let runStatus = runData.status;
    let finalRun;
    while (runStatus !== 'completed' && runStatus !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const checkRes = await fetch(`https://api.ope
