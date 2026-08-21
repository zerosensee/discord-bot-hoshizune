import { Events, Guild } from 'discord.js';

import { Event } from '@/base';
import { BotClient } from '@/bot-client';

export default new Event(
  Events.GuildCreate,
  false,
  async (botClient: BotClient, guild: Guild) => {
    if (!guild.available) return;

    const guildExists = await botClient.database.guild.findUnique({
      where: {
        discordId: guild.id,
      },
      select: {
        discordId: true,
      },
    });

    if (!guildExists) {
      await botClient.database.guild.create({
        data: {
          discordId: guild.id,
        },
      });

      botClient.logger.info(
        `Created guild with id: ${guild.id} (${guild.name})`,
      );
    } else {
      botClient.logger.info(`Guild with id: ${guild.id} already exists`);
    }
  },
);
