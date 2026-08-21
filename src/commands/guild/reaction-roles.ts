import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  Guild,
  GuildTextBasedChannel,
  EmbedBuilder,
  InteractionContextType,
  InteractionResponse,
  Message,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';
import { COLORS, EMOJIS } from '@/shared/constants';

export default class ReactionRolesCommand extends SlashCommand {
  public constructor() {
    super(
      new SlashCommandBuilder()
        .setName('reaction-roles')
        .setDescription('Setup reaction roles with role buttons + emoji modal')
        .addStringOption((option) =>
          option
            .setName('channel_id')
            .setDescription(
              'ID канала, где находится или создается сообщение с ролями',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('message_id')
            .setDescription(
              'ID существующего сообщения с ролями (необязательно)',
            )
            .setRequired(false),
        )
        .setContexts([InteractionContextType.Guild])
        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator,
        ) as SlashCommandBuilder,
    );
  }

  public async chatInput(
    botClient: BotClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<InteractionResponse | void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!interaction.inGuild() || !interaction.guild) return;
    const { guild } = interaction;

    const channelIdRaw =
      interaction.options.getString('channel_id') ?? '';
    const targetChannelId = channelIdRaw.replace(/\D/g, '');

    const messageIdRaw =
      interaction.options.getString('message_id') ?? '';
    const specifiedMessageId = messageIdRaw.replace(/\D/g, '');

    if (!targetChannelId) {
      await interaction.editReply({ content: 'Неверный channel_id.' });
      return;
    }

    const targetChannel = await guild.channels
      .fetch(targetChannelId)
      .catch(() => null);

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.editReply({
        content:
          'Канал не найден или не поддерживает сообщения. Нужен текстовый канал.',
      });
      return;
    }

    if (!interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.editReply({
        content: 'Команда должна быть выполнена в текстовом канале.',
      });
      return;
    }

    const dbGuild = await botClient.database.guild.upsert({
      where: { discordId: interaction.guildId },
      update: {},
      create: {
        discordId: interaction.guildId,
        autoRole: [],
      },
      select: { id: true },
    });

    const existing = await botClient.database.reactionRoleMessage.findFirst({
      where: { guildId: dbGuild.id },
      orderBy: { createdAt: 'asc' },
    });

    let managedMessage: Message | null = null;

    if (specifiedMessageId) {
      managedMessage = await (targetChannel as GuildTextBasedChannel).messages
        .fetch(specifiedMessageId)
        .catch(() => null);
    }

    if (!managedMessage) {
      managedMessage = await getManagedMessage(
        botClient,
        guild,
        existing?.channelId,
        existing?.messageId,
      );
    }

    // Авто-поиск сообщения по заголовку эмбеда в канале, если оно не было найдено в БД
    if (!managedMessage) {
      const recentMessages = await (
        targetChannel as GuildTextBasedChannel
      ).messages
        .fetch({ limit: 30 })
        .catch(() => null);

      if (recentMessages) {
        managedMessage =
          recentMessages.find(
            (m) =>
              m.author.id === botClient.user?.id &&
              m.embeds.some((e) =>
                e.title?.toLowerCase().includes('роли по реакциям'),
              ),
          ) ?? null;
      }
    }

    let mappings = toMappingsRecord(existing?.mappings);

    if (managedMessage?.embeds[0]?.description) {
      const parsedFromEmbed = parseMappingsFromText(
        managedMessage.embeds[0].description,
      );
      mappings = { ...parsedFromEmbed, ...mappings };
    }

    if (!managedMessage || managedMessage.channelId !== targetChannelId) {
      managedMessage = await (targetChannel as GuildTextBasedChannel).send(
        'Инициализация reaction roles...',
      );
    }

    const saved = existing
      ? await botClient.database.reactionRoleMessage.update({
          where: { id: existing.id },
          data: {
            channelId: managedMessage.channelId,
            messageId: managedMessage.id,
            mappings,
          },
        })
      : await botClient.database.reactionRoleMessage.create({
          data: {
            guildId: dbGuild.id,
            channelId: managedMessage.channelId,
            messageId: managedMessage.id,
            mappings,
          },
        });

    await this.syncReactionRoleMessage(
      botClient,
      guild,
      managedMessage,
      toMappingsRecord(saved.mappings),
    );

    const roles = guild.roles.cache
      .filter((role) => !role.managed && role.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .toJSON();

    if (!roles.length) {
      await interaction.editReply({
        content:
          'В сервере нет подходящих ролей. Создай роли и снова запусти команду.',
      });
      return;
    }

    let page = 0;
    const panelEmbed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.SHIELD} Reaction Roles Setup`)
      .setDescription(
        [
          `Канал сообщения: <#${managedMessage.channelId}>`,
          `Сообщение: [перейти](https://discord.com/channels/${interaction.guildId}/${managedMessage.channelId}/${managedMessage.id})`,
          '',
          'Нажми кнопку роли -> откроется окно, где вводишь эмодзи.',
          'После сохранения бот сразу обновит сообщение `эмодзи - роль` и реакции.',
        ].join('\n'),
      )
      .setFooter({
        text: 'Панель работает 15 минут. Перезапусти /reaction-roles для новой сессии.',
      });

    const panelMessage = await interaction.channel.send({
      embeds: [panelEmbed],
      components: this.buildRolePanelRows(roles, page, interaction.guildId),
    });

    await interaction.editReply({
      content: `Готово. Панель выбора ролей отправлена в ${interaction.channel}.`,
    });

    const collector = panelMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15 * 60 * 1000,
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          flags: [MessageFlags.Ephemeral],
          content: 'Эта панель принадлежит другому модератору.',
        });
        return;
      }

      const [kind, action, guildId, value] =
        buttonInteraction.customId.split(':');
      if (kind !== 'rr' || guildId !== interaction.guildId) {
        await buttonInteraction.deferUpdate();
        return;
      }

      if (action === 'page') {
        page = Number(value) || 0;
        await buttonInteraction.update({
          components: this.buildRolePanelRows(roles, page, interaction.guildId),
        });
        return;
      }

      if (action !== 'role') {
        await buttonInteraction.deferUpdate();
        return;
      }

      const roleId = value;
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        await buttonInteraction.reply({
          flags: [MessageFlags.Ephemeral],
          content: 'Роль не найдена (возможно удалена).',
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`rr:modal:${interaction.guildId}:${role.id}`)
        .setTitle(`Эмодзи для роли ${role.name}`)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('emoji')
              .setLabel('Emoji')
              .setPlaceholder('Например: 🎮 или <:name:123456789012345678>')
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
          ),
        );

      await buttonInteraction.showModal(modal);

      const modalInteraction = await buttonInteraction
        .awaitModalSubmit({
          time: 2 * 60 * 1000,
          filter: (submitted) =>
            submitted.customId === `rr:modal:${interaction.guildId}:${role.id}` &&
            submitted.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!modalInteraction) {
        return;
      }

      const emojiInput = modalInteraction.fields.getTextInputValue('emoji').trim();
      const parsedEmoji = parseEmojiInput(emojiInput);

      if (!parsedEmoji) {
        await modalInteraction.reply({
          flags: [MessageFlags.Ephemeral],
          content:
            'Неверный emoji. Используй Unicode (🎮) или custom формат `<:name:id>`.',
        });
        return;
      }

      const fresh = await botClient.database.reactionRoleMessage.findUnique({
        where: { id: saved.id },
      });

      const nextMappings = upsertRoleMapping(
        toMappingsRecord(fresh?.mappings),
        role.id,
        parsedEmoji,
      );

      const updated = await botClient.database.reactionRoleMessage.update({
        where: { id: saved.id },
        data: { mappings: nextMappings },
      });

      let targetMessage = await getManagedMessage(
        botClient,
        guild,
        updated.channelId,
        updated.messageId,
      );

      if (!targetMessage) {
        targetMessage = await (targetChannel as GuildTextBasedChannel).send(
          'Инициализация reaction roles...',
        );

        await botClient.database.reactionRoleMessage.update({
          where: { id: saved.id },
          data: {
            channelId: targetMessage.channelId,
            messageId: targetMessage.id,
          },
        });
      }

      await this.syncReactionRoleMessage(
        botClient,
        guild,
        targetMessage,
        toMappingsRecord(updated.mappings),
      );

      await modalInteraction.reply({
        flags: [MessageFlags.Ephemeral],
        content: `Сохранено: ${parsedEmoji.display} -> ${role}`,
      });
    });

    collector.on('end', async () => {
      await panelMessage
        .edit({ components: [] })
        .catch(() => undefined);
    });
  }

  private buildRolePanelRows(
    roles: Array<{ id: string; name: string }>,
    page: number,
    guildId: string,
  ) {
    const perPage = 20;
    const totalPages = Math.max(1, Math.ceil(roles.length / perPage));
    const safePage = Math.min(Math.max(page, 0), totalPages - 1);
    const start = safePage * perPage;
    const roleSlice = roles.slice(start, start + perPage);

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (let i = 0; i < roleSlice.length; i += 5) {
      const chunk = roleSlice.slice(i, i + 5);
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const role of chunk) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`rr:role:${guildId}:${role.id}`)
            .setLabel(role.name.slice(0, 80))
            .setStyle(ButtonStyle.Secondary),
        );
      }
      rows.push(row);
    }

    if (totalPages > 1) {
      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`rr:page:${guildId}:${Math.max(0, safePage - 1)}`)
            .setLabel('Prev')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(safePage === 0),
          new ButtonBuilder()
            .setCustomId(`rr:page:${guildId}:${Math.min(totalPages - 1, safePage + 1)}`)
            .setLabel(`Next (${safePage + 1}/${totalPages})`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(safePage >= totalPages - 1),
        ),
      );
    }

    return rows;
  }

  private async syncReactionRoleMessage(
    botClient: BotClient,
    guild: Guild,
    message: Message,
    mappings: RoleEmojiMappings,
  ): Promise<void> {
    const lines = Object.entries(mappings)
      .map(([emojiKey, value]) => {
        const roleId = typeof value === 'string' ? value : value.roleId;
        const display = typeof value === 'string' ? emojiKey : value.emojiDisplay;
        return `${display} - <@&${roleId}>`;
      })
      .sort((a, b) => a.localeCompare(b, 'ru'));

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.SHIELD} Роли по реакциям`)
      .setDescription(
        lines.length
          ? lines.join('\n')
          : 'Пока нет связок. Модератор добавит их через панель настройки.',
      )
      .setFooter({ text: 'Поставь реакцию, чтобы получить роль. Убери реакцию, чтобы снять роль.' });

    await message.edit({ embeds: [embed], content: '' });
    await message.reactions.removeAll().catch(() => undefined);

    for (const value of Object.values(mappings)) {
      const display = typeof value === 'string' ? null : value.emojiDisplay;
      const reactValue = display ? toReactIdentifier(display) : null;
      if (!reactValue) continue;
      await message.react(reactValue).catch(() => undefined);
    }

    botClient.logger.info(
      `Reaction-role message synced for guild ${guild.id} message ${message.id}`,
    );
  }
}

type RoleEmojiMappingValue =
  | string
  | {
      roleId: string;
      emojiDisplay: string;
    };

type RoleEmojiMappings = Record<string, RoleEmojiMappingValue>;

type ParsedEmoji = {
  key: string;
  display: string;
};

function toMappingsRecord(input: unknown): RoleEmojiMappings {
  if (!input || typeof input !== 'object') return {};
  return input as RoleEmojiMappings;
}

function parseEmojiInput(input: string): ParsedEmoji | null {
  if (!input) return null;

  const customMatch = input.match(/^<(a?):([a-zA-Z0-9_]{2,32}):(\d{17,20})>$/);
  if (customMatch) {
    const [, animated, name, id] = customMatch;
    return {
      key: id,
      display: animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`,
    };
  }

  if (input.length > 64) return null;
  return { key: input, display: input };
}

function upsertRoleMapping(
  mappings: RoleEmojiMappings,
  roleId: string,
  emoji: ParsedEmoji,
): RoleEmojiMappings {
  const next = { ...mappings };

  for (const [key, value] of Object.entries(next)) {
    const mappedRoleId = typeof value === 'string' ? value : value.roleId;
    if (mappedRoleId === roleId || key === emoji.key) {
      delete next[key];
    }
  }

  next[emoji.key] = {
    roleId,
    emojiDisplay: emoji.display,
  };

  return next;
}

function toReactIdentifier(display: string): string {
  const customMatch = display.match(/^<(a?):([a-zA-Z0-9_]{2,32}):(\d{17,20})>$/);
  if (!customMatch) return display;
  const [, , name, id] = customMatch;
  return `${name}:${id}`;
}

async function getManagedMessage(
  botClient: BotClient,
  guild: Guild,
  channelId?: string,
  messageId?: string,
): Promise<Message | null> {
  if (!channelId || !messageId) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return null;

  const message = await (channel as GuildTextBasedChannel).messages
    .fetch(messageId)
    .catch(() => null);
  if (!message) {
    botClient.logger.warn(
      `Reaction-role message ${messageId} not found in channel ${channelId}`,
    );
  }
  return message;
}

function parseMappingsFromText(
  text: string,
): Record<string, { roleId: string; emojiDisplay: string }> {
  const mappings: Record<string, { roleId: string; emojiDisplay: string }> = {};
  if (!text) return mappings;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line
      .trim()
      .match(
        /^(<a?:[a-zA-Z0-9_]{2,32}:\d{17,20}>|.+?)\s*[-—–=]\s*<@&(\d{17,20})>$/,
      );

    if (match) {
      const display = match[1].trim();
      const roleId = match[2].trim();
      const customMatch = display.match(
        /^<(a?):([a-zA-Z0-9_]{2,32}):(\d{17,20})>$/,
      );
      const key = customMatch ? customMatch[3] : display;
      mappings[key] = { roleId, emojiDisplay: display };
    }
  }

  return mappings;
}
