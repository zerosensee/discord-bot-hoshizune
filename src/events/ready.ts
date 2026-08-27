import { Events } from 'discord.js';

import { Event } from '@/base';

export default new Event(Events.ClientReady, true, (botClient) => {
  botClient.logger.info(
    `🎉 Bot was launched as ${botClient.user.username} (ID: ${botClient.user.id})`,
  );
  botClient.logger.info(`🌐 Connected to ${botClient.guilds.cache.size} guilds`);

  if (botClient.guilds.cache.size > 0) {
    botClient.guilds.cache.forEach((guild) => {
      botClient.logger.info(`   - ${guild.name} (${guild.id})`);
    });
  } else {
    botClient.logger.warn(
      '⚠️ Bot is not in any guilds! Use the invite link to add it.',
    );
  }

  // Запуск начальной активности через наш PresenceService
  const initialPreset =
    botClient.presenceService.presets.find((p) => p.id === 'yanima_stream') ||
    botClient.presenceService.presets[0];

  if (initialPreset) {
    botClient.presenceService.setActivity(initialPreset);
  }
});
