import { Events, Guild } from 'discord.js';

import { Event } from '@/base';
import { BotClient } from '@/bot-client';

export default new Event(
  Events.GuildDelete,
  false,
  async (botClient: BotClient, guild: Guild) => {
    if (!guild.available) return;

    try {
      const existing = await botClient.database.guild.findUnique({
        where: {
          discordId: guild.id,
        },
      });

      if (!existing) {
        botClient.logger.info(
          `Guild ${guild.id} (${guild.name}) not found in database, skipping deletion.`,
        );
        return;
      }

      await botClient.database.guild.delete({
        where: { discordId: guild.id },
      });

      botClient.logger.info(
        `Guild ${guild.id} (${guild.name}) removed from database.`,
      );
    } catch (error) {
      botClient.logger.error(`Error while removing guild ${guild.id}`, error);
    }
  },
);
