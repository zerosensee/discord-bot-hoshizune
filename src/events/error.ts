import { Events } from 'discord.js';

import { Event } from '@/base';

export default new Event(Events.Error, false, (botClient, error) => {
  botClient.logger.error(error);
});
