import { Events } from 'discord.js';

import { Event } from '@/base';

export default new Event(Events.Warn, false, (botClient, message) => {
  botClient.logger.warn(message);
});
