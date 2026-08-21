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
    const reactionRoleMessage =
      await botClient.database.reactionRoleMessage.findUnique({
        where: {
          guildId_channelId_messageId: {
            guildId: dbGuild.id,
            channelId: reaction.message.channelId,
            messageId: reaction.message.id,
          },
        },
      });

    if (!reactionRoleMessage) {
      botClient.logger.info(
        `Реакция проигнорирована: сообщение ${reaction.message.id} не зарегистрировано через /reaction-roles в базе данных.`,
      );
      return;
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
