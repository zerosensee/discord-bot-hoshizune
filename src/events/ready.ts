import { ActivityType, Events } from 'discord.js';

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

  botClient.user.setActivity({
    type: ActivityType.Streaming,
    name: 'Yanima.Space',
    url: 'https://www.twitch.tv/yanimaspace',
  });
});
