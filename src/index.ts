import process from 'node:process';

import { GatewayIntentBits, Partials } from 'discord.js';
import { Client as NekosBest } from 'nekos-best.js';

import { Database } from '@/services';
import { createLogger, env } from '@/utils';

import { BotClient } from './bot-client';

const logger = createLogger('hoshizune');

const database = new Database();
const nekosBest = new NekosBest();

const botClient = new BotClient(
  {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    // Partials нужны для обработки реакций на старые (незакешированные) сообщения
    partials: [
      Partials.Message,
      Partials.Reaction,
      Partials.User,
    ],
  },
  database,
  nekosBest,
);


(async () => {
  logger.info('🤫 Environment variables preparing');
  await env.prepare();

  if (process.argv.includes('--rest')) {
    logger.info('🌍 REST mode selected, starting');
    await botClient.startRest();
  } else {
    try {
      await database.connect();
    } catch (error) {
      logger.error(`❌ Не удалось подключиться к базе данных`, error);
      process.exit(1);
    }

    logger.info('🤖 Bot mode selected, starting');
    await botClient.startBot();
  }
})();
