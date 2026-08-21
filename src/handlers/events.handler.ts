import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { ClientEvents } from 'discord.js';

import { Event } from '@/base';
import { BotClient } from '@/bot-client';
import { createLogger } from '@/utils';

export class EventsHandler {
  private static readonly logger = createLogger('events-handler');

  public static async prepare(botClient: BotClient): Promise<void> {
    await this.walk(botClient, join(__dirname, '..', 'events'));
  }

  private static async walk(botClient: BotClient, dir: string): Promise<void> {
    if (!(await lstat(dir)).isDirectory()) {
      const event: Event<keyof ClientEvents> = (await import(dir)).default;

      if (event.once) {
        botClient.once(event.name, (...args) =>
          event.listener(botClient, ...args),
        );
      } else {
        botClient.on(event.name, (...args) =>
          event.listener(botClient, ...args),
        );
      }

      this.logger.info(`📅 Loaded ${event.name} event`);

      return;
    }

    for (const file of await readdir(dir)) {
      await this.walk(botClient, join(dir, file));
    }
  }
}
