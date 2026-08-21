import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { ApplicationCommandDataResolvable } from 'discord.js';

import { ContextMenuCommand, SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';
import { createLogger } from '@/utils';

export class CommandsHandler {
  private static readonly logger = createLogger('commands-handler');

  public static async prepare(botClient: BotClient): Promise<void> {
    await this.walk(botClient, join(__dirname, '..', 'commands'), []);
  }

  public static async getApplicationCommandsData(): Promise<
    ApplicationCommandDataResolvable[]
  > {
    return await this.walk(null, join(__dirname, '..', 'commands'), []);
  }

  private static async walk(
    botClient: BotClient | null,
    dir: string,
    dataArray: ApplicationCommandDataResolvable[],
  ): Promise<ApplicationCommandDataResolvable[]> {
    if (!(await lstat(dir)).isDirectory()) {
      // eslint-disable-next-line new-cap
      const command = new (await import(dir)).default();

      if (command instanceof SlashCommand) {
        if (botClient) {
          botClient.slashCommands.set(command.data.name, command);
          this.logger.info(`🔧 Loaded ${command.data.name} slash command`);
        }
      }

      if (command instanceof ContextMenuCommand) {
        if (botClient) {
          botClient.contextMenuCommands.set(command.data.name, command);
          this.logger.info(
            `🔧 Loaded ${command.data.name} context menu command`,
          );
        }
      }

      dataArray.push(command.data);

      return dataArray;
    }

    for (const file of await readdir(dir)) {
      await this.walk(botClient, join(dir, file), dataArray);
    }

    return dataArray;
  }
}
