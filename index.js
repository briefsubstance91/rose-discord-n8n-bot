import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_BOT_TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// In-memory store: Discord user ID -> OpenAI thread ID
const userThreads = {};

client.once('ready', () => {
  console.log(`🤖 Rose bot is online as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const userMessage = message.content;

  try {
    let threadId = userThreads[userId];

    // STEP 1: Create thread if it doesn't exist for this user
    if (!threadId) {
      const threadRes = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v1',
          'Content-Type': 'application/json'
        }
      });
      const threadData = await threadRes.json();
      threadId = threadData.id;
      userThreads[userId] = threadId;
      console.log(`🧵 New thread created for ${message.author.username}: ${threadId}`);
    }

    // STEP 2: Post user's message to thread
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });

    // STEP 3: Run assistant on the thread
    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: process.env.ASSISTANT_ID
      })
    });

    const runData = await runRes.json();

    // STEP 4: Poll until run completes
    let runStatus = runData.status;
    let finalRun;
    while (runStatus !== 'completed' && runStatus !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runData.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      finalRun = await statusRes.json();
      runStatus = finalRun.status;
    }

    // STEP 5: Fetch the assistant's latest reply
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v1'
      }
    });

    const messagesData = await messagesRes.json();
    const assistantReply = messagesData.data.find(m => m.role === 'assistant');

    if (assistantReply?.content?.[0]?.text?.value) {
      await message.reply(assistantReply.content[0].text.value);
    } else {
      await message.reply("🪻 Rose didn't respond this time.");
    }

  } catch (error) {
    console.error("❌ Error with Assistant:", error);
    await message.reply("⚠️ Rose had a problem talking to OpenAI.");
  }
});

client.login(token);
