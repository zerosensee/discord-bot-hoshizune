import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  Guild,
  GuildTextBasedChannel,
  InteractionContextType,
  InteractionResponse,
  Message,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';
import { COLORS, EMOJIS } from '@/shared/constants';

/**
 * Описание типа значений маппинга ролей и эмодзи.
 */
type RoleEmojiMappingValue =
  | string
  | {
      roleId: string;
      emojiDisplay: string;
    };

/**
 * Таблица маппинга ролей к эмодзи.
 */
type RoleEmojiMappings = Record<string, RoleEmojiMappingValue>;

/**
 * Структура обработанного эмодзи.
 */
type ParsedEmoji = {
  key: string;
  display: string;
};

/**
 * Вспомогательное преобразование неизвестных данных в объект маппинга.
 * @param input - Входящие данные
 * @returns Приведенный объект маппинга ролей
 */
function toMappingsRecord(input: unknown): RoleEmojiMappings {
  if (!input || typeof input !== 'object') return {};
  return input as RoleEmojiMappings;
}

/**
 * Парсинг строки ввода эмодзи (Unicode или custom формат).
 * @param input - Введенная пользователем строка эмодзи
 * @returns Распарсенный объект эмодзи или null
 */
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

/**
 * Добавление или обновление маппинга роли и эмодзи.
 * @param mappings - Текущая таблица маппинга
 * @param roleId - Идентификатор роли
 * @param emoji - Структура эмодзи
 * @returns Обновленная таблица маппинга
 */
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

/**
 * Удаление выбранного набора ролей из таблицы маппинга.
 * @param mappings - Текущая таблица маппинга
 * @param rolesToRemove - Множество ID ролей для удаления
 * @returns Обновленная таблица маппинга
 */
function removeRolesFromMappings(
  mappings: RoleEmojiMappings,
  rolesToRemove: Set<string>,
): RoleEmojiMappings {
  const next = { ...mappings };

  for (const [key, value] of Object.entries(next)) {
    const roleId = typeof value === 'string' ? value : value.roleId;
    if (rolesToRemove.has(roleId)) {
      delete next[key];
    }
  }

  return next;
}

/**
 * Преобразование отображаемого эмодзи в идентификатор для реакций Discord.
 * @param display - Строковое представление эмодзи
 * @returns Идентификатор реакций для message.react()
 */
function toReactIdentifier(display: string): string {
  const customMatch = display.match(/^<(a?):([a-zA-Z0-9_]{2,32}):(\d{17,20})>$/);
  if (!customMatch) return display;
  const [, , name, id] = customMatch;
  return `${name}:${id}`;
}

/**
 * Получение управляемого сообщения с реактивными ролями.
 * @param botClient - Экземпляр клиента бота
 * @param guild - Сервер Discord
 * @param channelId - Идентификатор канала
 * @param messageId - Идентификатор сообщения
 * @returns Объект сообщения Discord или null
 */
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
      `Сообщение с реакциями ${messageId} не найдено в канале ${channelId}`,
    );
  }
  return message;
}

/**
 * Извлечение маппинга ролей из текстового описания Embed сообщения.
 * @param text - Описание Embed сообщения
 * @returns Объект распарсенного маппинга ролей
 */
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

/**
 * Команда интерактивной настройки выдачи ролей по реакциям.
 */
export default class ReactionRolesCommand extends SlashCommand {
  public constructor() {
    super(
      new SlashCommandBuilder()
        .setName('reaction-roles')
        .setDescription('Настройка выдачи ролей по реакциям с выбором эмодзи')
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

  /**
   * Точка входа для обработки Slash-команды /reaction-roles.
   * @param botClient - Экземпляр клиента бота
   * @param interaction - Интеракция slash-команды
   */
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

    // Сбор ролей из ВСЕХ сообщений бота с реактивными ролями в канале
    const recentMessages = await (
      targetChannel as GuildTextBasedChannel
    ).messages
      .fetch({ limit: 50 })
      .catch(() => null);

    let allEmbedMappings: RoleEmojiMappings = {};

    if (recentMessages) {
      const botMessages = Array.from(recentMessages.values())
        .filter(
          (m) =>
            m.author.id === botClient.user?.id &&
            m.embeds.some((e) =>
              e.title?.toLowerCase().includes('роли по реакциям'),
            ),
        )
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      for (const msg of botMessages) {
        if (msg.embeds[0]?.description) {
          const parsed = parseMappingsFromText(msg.embeds[0].description);
          allEmbedMappings = { ...allEmbedMappings, ...parsed };
        }
      }

      if (!managedMessage && botMessages.length > 0) {
        managedMessage = botMessages[botMessages.length - 1];
      }
    }

    const mappings = {
      ...allEmbedMappings,
      ...toMappingsRecord(existing?.mappings),
    };

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
          'На сервере нет подходящих ролей. Создайте роли и заново запустите команду.',
      });
      return;
    }

    let page = 0;
    const panelEmbed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.SHIELD} Настройка выдачи ролей по реакциям`)
      .setDescription(
        [
          `Канал сообщения: <#${managedMessage.channelId}>`,
          `Сообщение: [перейти](https://discord.com/channels/${interaction.guildId}/${managedMessage.channelId}/${managedMessage.id})`,
          '',
          '➕ **Добавление роли:** Нажмите на кнопку нужной роли -> выберите имеющийся эмодзи сервера из выпадающего списка (или введите вручную).',
          '🗑️ **Удаление ролей из выдачи:** Нажмите красную кнопку "Удалить роли из выдачи" и выберите одну или несколько ролей для изъятия.',
        ].join('\n'),
      )
      .setFooter({
        text: 'Панель активна 15 минут. Запустите /reaction-roles повторно при необходимости.',
      });

    const panelMessage = await interaction.channel.send({
      embeds: [panelEmbed],
      components: this.buildRolePanelRows(roles, page, interaction.guildId),
    });

    await interaction.editReply({
      content: `Панель настройки ролей успешно отправлена в ${interaction.channel}.`,
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

      // Пагинация списка ролей
      if (action === 'page') {
        page = Number(value) || 0;
        await buttonInteraction.update({
          components: this.buildRolePanelRows(roles, page, interaction.guildId),
        });
        return;
      }

      // Удаление ролей из маппинга выдачи
      if (action === 'remove_roles') {
        const fresh = await botClient.database.reactionRoleMessage.findUnique({
          where: { id: saved.id },
        });

        const currentMappings = toMappingsRecord(fresh?.mappings);
        const mappedEntries = Object.entries(currentMappings);

        if (mappedEntries.length === 0) {
          await buttonInteraction.reply({
            flags: [MessageFlags.Ephemeral],
            content:
              'В данный момент в сообщении нет настроенных ролей для удаления из выдачи.',
          });
          return;
        }

        const deleteSelect = new StringSelectMenuBuilder()
          .setCustomId(`rr:delete_select:${interaction.guildId}`)
          .setPlaceholder('Выберите роли для удаления из списка выдачи')
          .setMinValues(1)
          .setMaxValues(Math.min(mappedEntries.length, 25));

        for (const [emojiKey, val] of mappedEntries) {
          const roleId = typeof val === 'string' ? val : val.roleId;
          const display = typeof val === 'string' ? emojiKey : val.emojiDisplay;
          const roleObj = guild.roles.cache.get(roleId);
          const roleName = roleObj ? roleObj.name : `Роль ID: ${roleId}`;

          deleteSelect.addOptions({
            label: `@${roleName}`.slice(0, 100),
            value: roleId,
            description: `Эмодзи: ${display}`.slice(0, 100),
          });
        }

        const deleteMsg = await buttonInteraction.reply({
          flags: [MessageFlags.Ephemeral],
          content:
            '⚠️ **Удаление ролей из списка выдачи по реакциям**\nВыберите одну или несколько ролей для удаления из списка выдачи (самы роли на сервере удалены НЕ будут):',
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              deleteSelect,
            ),
          ],
          withResponse: true,
        });

        const selectInteraction =
          await deleteMsg.resource?.message?.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: (i) => i.user.id === buttonInteraction.user.id,
          }).catch(() => null);

        if (!selectInteraction) return;

        await selectInteraction.deferUpdate().catch(() => null);

        const rolesToRemove = new Set(selectInteraction.values);
        const updatedMappings = removeRolesFromMappings(
          currentMappings,
          rolesToRemove,
        );

        const updated = await botClient.database.reactionRoleMessage.update({
          where: { id: saved.id },
          data: { mappings: updatedMappings },
        });

        const targetMsg = await getManagedMessage(
          botClient,
          guild,
          updated.channelId,
          updated.messageId,
        );

        if (targetMsg) {
          await this.syncReactionRoleMessage(
            botClient,
            guild,
            targetMsg,
            toMappingsRecord(updated.mappings),
          );
        }

        await selectInteraction.followUp({
          flags: [MessageFlags.Ephemeral],
          content: `✅ Из выдачи по реакциям успешно удалено ролей: ${rolesToRemove.size}. Сами роли на сервере сохранены.`,
        }).catch(() => null);
        return;
      }

      // Выбор роли для привязки эмодзи
      if (action !== 'role') {
        await buttonInteraction.deferUpdate();
        return;
      }

      const roleId = value;
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        await buttonInteraction.reply({
          flags: [MessageFlags.Ephemeral],
          content: 'Роль не найдена на сервере (возможно удалена).',
        });
        return;
      }

      // Получаем имеющиеся эмодзи на сервере
      const serverEmojis = await guild.emojis.fetch().catch(() => null);
      const customEmojis = serverEmojis
        ? Array.from(serverEmojis.values())
        : [];

      let parsedEmoji: ParsedEmoji | null = null;

      if (customEmojis.length > 0) {
        const emojiSelect = new StringSelectMenuBuilder()
          .setCustomId(`rr:select_emoji:${interaction.guildId}:${role.id}`)
          .setPlaceholder('Выберите эмодзи сервера или ввод вручную');

        const emojiSlice = customEmojis.slice(0, 24);
        for (const emoji of emojiSlice) {
          emojiSelect.addOptions({
            label: emoji.name || 'Emoji',
            value: `custom:${emoji.name}:${emoji.id}:${emoji.animated ? '1' : '0'}`,
            description: `Эмодзи сервера: :${emoji.name}:`,
            emoji: {
              id: emoji.id,
              name: emoji.name || undefined,
              animated: emoji.animated || undefined,
            },
          });
        }

        emojiSelect.addOptions({
          label: 'Ввести эмодзи вручную',
          value: 'manual',
          description: 'Ввести Unicode (🎮) или эмодзи стороннего сервера',
          emoji: '✍️',
        });

        const emojiMsg = await buttonInteraction.reply({
          flags: [MessageFlags.Ephemeral],
          content: `Выберите эмодзи для роли **${role.name}** из списка имеющихся эмодзи сервера:`,
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              emojiSelect,
            ),
          ],
          withResponse: true,
        });

        const selectInteraction =
          await emojiMsg.resource?.message?.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: (i) => i.user.id === buttonInteraction.user.id,
          }).catch(() => null);

        if (!selectInteraction) return;

        const selectedVal = selectInteraction.values[0];

        if (selectedVal === 'manual') {
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

          await selectInteraction.showModal(modal);

          const modalSubmit = await selectInteraction
            .awaitModalSubmit({
              time: 2 * 60 * 1000,
              filter: (submitted) =>
                submitted.customId ===
                  `rr:modal:${interaction.guildId}:${role.id}` &&
                submitted.user.id === interaction.user.id,
            })
            .catch(() => null);

          if (!modalSubmit) return;

          const input = modalSubmit.fields.getTextInputValue('emoji').trim();
          parsedEmoji = parseEmojiInput(input);

          if (!parsedEmoji) {
            await modalSubmit.reply({
              flags: [MessageFlags.Ephemeral],
              content:
                'Неверный emoji. Используй Unicode (🎮) или custom формат `<:name:id>`.',
            });
            return;
          }

          await this.applyRoleEmojiMapping(
            botClient,
            guild,
            targetChannel as GuildTextBasedChannel,
            saved.id,
            role,
            parsedEmoji,
            modalSubmit,
          );
          return;
        } else {
          const [, eName, eId, eAnimated] = selectedVal.split(':');
          parsedEmoji = {
            key: eId,
            display:
              eAnimated === '1' ? `<a:${eName}:${eId}>` : `<:${eName}:${eId}>`,
          };

          await this.applyRoleEmojiMapping(
            botClient,
            guild,
            targetChannel as GuildTextBasedChannel,
            saved.id,
            role,
            parsedEmoji,
            selectInteraction,
          );
          return;
        }
      } else {
        // Если кастомных эмодзи на сервере нет — открываем модальное окно
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
              submitted.customId ===
                `rr:modal:${interaction.guildId}:${role.id}` &&
              submitted.user.id === interaction.user.id,
          })
          .catch(() => null);

        if (!modalInteraction) return;

        const emojiInput = modalInteraction
          .fields.getTextInputValue('emoji')
          .trim();
        parsedEmoji = parseEmojiInput(emojiInput);

        if (!parsedEmoji) {
          await modalInteraction.reply({
            flags: [MessageFlags.Ephemeral],
            content:
              'Неверный emoji. Используй Unicode (🎮) или custom формат `<:name:id>`.',
          });
          return;
        }

        await this.applyRoleEmojiMapping(
          botClient,
          guild,
          targetChannel as GuildTextBasedChannel,
          saved.id,
          role,
          parsedEmoji,
          modalInteraction,
        );
        return;
      }
    });

    collector.on('end', async () => {
      await panelMessage.edit({ components: [] }).catch(() => undefined);
    });
  }

  /**
   * Сохранение маппинга эмодзи к роли в БД и синхронизация сообщения.
   * @param botClient - Экземпляр клиента бота
   * @param guild - Сервер Discord
   * @param targetChannel - Текстовый канал
   * @param recordId - ID записи в базе данных
   * @param role - Объект роли
   * @param parsedEmoji - Парсенный эмодзи
   * @param interactionResponder - Объект интеракции для ответа пользователю
   */
  private async applyRoleEmojiMapping(
    botClient: BotClient,
    guild: Guild,
    targetChannel: GuildTextBasedChannel,
    recordId: string,
    role: { id: string; name: string },
    parsedEmoji: ParsedEmoji,
    interactionResponder: any,
  ): Promise<void> {
    if (!interactionResponder.deferred && !interactionResponder.replied) {
      if (typeof interactionResponder.deferUpdate === 'function') {
        await interactionResponder.deferUpdate().catch(() => null);
      } else if (typeof interactionResponder.deferReply === 'function') {
        await interactionResponder.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);
      }
    }

    const fresh = await botClient.database.reactionRoleMessage.findUnique({
      where: { id: recordId },
    });

    const nextMappings = upsertRoleMapping(
      toMappingsRecord(fresh?.mappings),
      role.id,
      parsedEmoji,
    );

    const updated = await botClient.database.reactionRoleMessage.update({
      where: { id: recordId },
      data: { mappings: nextMappings },
    });

    let targetMessage = await getManagedMessage(
      botClient,
      guild,
      updated.channelId,
      updated.messageId,
    );

    if (!targetMessage) {
      targetMessage = await targetChannel.send(
        'Инициализация reaction roles...',
      );

      await botClient.database.reactionRoleMessage.update({
        where: { id: recordId },
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

    if (typeof interactionResponder.followUp === 'function') {
      await interactionResponder.followUp({
        flags: [MessageFlags.Ephemeral],
        content: `Сохранено: ${parsedEmoji.display} -> <@&${role.id}>`,
      }).catch(() => null);
    } else if (typeof interactionResponder.editReply === 'function') {
      await interactionResponder.editReply({
        content: `Сохранено: ${parsedEmoji.display} -> <@&${role.id}>`,
      }).catch(() => null);
    }
  }

  /**
   * Построение кнопок панели управления ролями.
   * @param roles - Массив доступных ролей сервера
   * @param page - Номер текущей страницы
   * @param guildId - Идентификатор сервера
   * @returns Массив строк с кнопками ActionRowBuilder
   */
  private buildRolePanelRows(
    roles: Array<{ id: string; name: string }>,
    page: number,
    guildId: string,
  ): ActionRowBuilder<ButtonBuilder>[] {
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

    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    if (totalPages > 1) {
      actionRow.addComponents(
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
      );
    }

    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`rr:remove_roles:${guildId}`)
        .setLabel('Удалить роли из выдачи')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️'),
    );

    rows.push(actionRow);

    return rows;
  }

  /**
   * Синхронизация Embed-сообщения с реактивными ролями и установка реакций.
   * @param botClient - Экземпляр клиента бота
   * @param guild - Сервер Discord
   * @param message - Сообщение с реактивными ролями
   * @param mappings - Текущая таблица маппинга ролей
   */
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
      `Синхронизировано сообщение реактивных ролей для сервера ${guild.id}, сообщение ${message.id}`,
    );
  }
}
