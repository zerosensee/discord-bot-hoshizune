import { ClientEvents } from 'discord.js';

import { BotClient } from '@/bot-client';

export class Event<T extends keyof ClientEvents> {
  public constructor(
    public name: T,
    public once: boolean,
    public listener: (botClient: BotClient, ...args: ClientEvents[T]) => void,
  ) {}
}
