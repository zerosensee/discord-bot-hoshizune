import { Events } from 'discord.js';

import { Event } from '@/base/event';

export default new Event(
  Events.InteractionCreate,
  false,
  (botClient, interaction) => {
    if (interaction.isChatInputCommand()) {
      botClient.slashCommands
        .get(interaction.commandName)
        ?.chatInput(botClient, interaction);
    }

    if (interaction.isContextMenuCommand()) {
      botClient.contextMenuCommands
        .get(interaction.commandName)
        ?.contextMenu(botClient, interaction);
    }
  },
);
