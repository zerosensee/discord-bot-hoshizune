import {
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  ContextMenuCommandInteraction,
  InteractionResponse,
  SlashCommandBuilder,
} from 'discord.js';

import { BotClient } from '@/bot-client';

export abstract class SlashCommand {
  public constructor(public readonly data: SlashCommandBuilder) {}

  abstract chatInput(
    botClient: BotClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<InteractionResponse | void>;
}

export abstract class ContextMenuCommand {
  public constructor(public readonly data: ContextMenuCommandBuilder) {}

  abstract contextMenu(
    botClient: BotClient,
    interaction: ContextMenuCommandInteraction,
  ): Promise<InteractionResponse | void>;
}
