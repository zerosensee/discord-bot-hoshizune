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

    // Find guild in database to get internal UUID
    const dbGuild = await botClient.database.guild.findUnique({
      where: { discordId: guild.id },
      select: { id: true },
    });

    if (!dbGuild) return;

    // Find reaction role message in database
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

    if (!reactionRoleMessage) return;

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
          `Role ${roleId} not found in guild ${guild.id}`,
        );
        return;
      }

      await member.roles.add(role);
      botClient.logger.info(
        `Added role ${role.name} to user ${user.tag} in guild ${guild.name}`,
      );
    } catch (error) {
      botClient.logger.error('Error adding role', error);
    }
  },
);
