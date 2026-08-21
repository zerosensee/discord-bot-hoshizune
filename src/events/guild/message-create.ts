import { Events, Message } from 'discord.js';

import { Event } from '@/base';
import { BotClient } from '@/bot-client';

/**
 * Обработчик создания сообщения для сбора статистики активности каналов.
 * Инкрементирует счетчик сообщений для текущего канала и текущей даты.
 */
export default new Event(
  Events.MessageCreate,
  false,
  async (botClient: BotClient, message: Message): Promise<void> => {
    if (message.author.bot || !message.guild) return;

    // Сбрасываем время до начала дня для группировки в БД
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Получаем внутренний ID сервера из БД
      const dbGuild = await botClient.database.guild.findUnique({
        where: { discordId: message.guild.id },
        select: { id: true },
      });

      if (!dbGuild) {
        botClient.logger.warn(
          `Guild ${message.guild.id} not found in DB during message tracking`,
        );
        return;
      }

      // Обновляем или создаем запись статистики за текущий день
      await botClient.database.channelStats.upsert({
        where: {
          guildId_channelId_date: {
            guildId: dbGuild.id,
            channelId: message.channel.id,
            date: today,
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          guildId: dbGuild.id,
          channelId: message.channel.id,
          date: today,
          count: 1,
        },
      });
    } catch (error) {
      botClient.logger.error(
        `Failed to track message in channel ${message.channel.id}`,
        error,
      );
    }
  },
);
