import {
  Events,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from 'discord.js';

import { Event } from '@/base';
import { BotClient } from '@/bot-client';

export default new Event(
  Events.MessageReactionAdd,
  false,
  async (
    botClient: BotClient,
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ) => {
    // Ignore bot reactions
    if (user.bot) return;

    // Fetch full reaction if partial
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        botClient.logger.error('Error fetching partial reaction', error);
        return;
      }
    }

    if (!reaction.message.guild) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);

    if (!member) return;

    // Get emoji identifier (name for unicode, id for custom)
    const emojiId = reaction.emoji.id || reaction.emoji.name;

    if (!emojiId) return;

    // Поиск или автоматическое создание сервера в базе данных
    const dbGuild = await botClient.database.guild.upsert({
      where: { discordId: guild.id },
      create: { discordId: guild.id },
      update: {},
      select: { id: true },
    });

    // Поиск маппинга реактивных ролей для сообщения
    let reactionRoleMessage =
      await botClient.database.reactionRoleMessage.findUnique({
        where: {
          guildId_channelId_messageId: {
            guildId: dbGuild.id,
            channelId: reaction.message.channelId,
            messageId: reaction.message.id,
          },
        },
      });

    // Автоматическое сканирование и запись существующего сообщения с ролями
    if (!reactionRoleMessage) {
      if (!reaction.message.content && !reaction.message.embeds.length) {
        await reaction.message.fetch().catch(() => null);
      }

      const embedText =
        reaction.message.embeds[0]?.description ??
        reaction.message.content ??
        '';

      const parsedMappings = parseMappingsFromText(embedText);

      if (Object.keys(parsedMappings).length > 0) {
        reactionRoleMessage =
          await botClient.database.reactionRoleMessage.create({
            data: {
              guildId: dbGuild.id,
              channelId: reaction.message.channelId,
              messageId: reaction.message.id,
              mappings: parsedMappings,
            },
          });
        botClient.logger.info(
          `Автоматически восстановлена структура ролей для сообщения ${reaction.message.id} на сервере "${guild.name}"!`,
        );
      } else {
        botClient.logger.info(
          `Реакция проигнорирована: сообщение ${reaction.message.id} не зарегистрировано в БД и не содержит структуры ролей.`,
        );
        return;
      }
    }

    const mappings =
      reactionRoleMessage.mappings as Record<
        string,
        string | { roleId: string; emojiDisplay?: string }
      >;
    const mapped = mappings[emojiId];
    const roleId = typeof mapped === 'string' ? mapped : mapped?.roleId;

    if (!roleId) return;

    try {
      const role = guild.roles.cache.get(roleId);

      if (!role) {
        botClient.logger.warn(
          `Роль ${roleId} не найдена на сервере ${guild.name} (${guild.id})`,
        );
        return;
      }

      await member.roles.add(role);
      botClient.logger.info(
        `Роль "${role.name}" успешно выдана пользователю ${user.tag} на сервере "${guild.name}"`,
      );
    } catch (error) {
      botClient.logger.error('Ошибка при выдаче роли по реакции', error);
    }
  },
);

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
