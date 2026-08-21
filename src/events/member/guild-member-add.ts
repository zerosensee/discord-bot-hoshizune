import { Events, GuildMember, Role } from 'discord.js';

import { Event } from '@/base';
import { BotClient } from '@/bot-client';

export default new Event(
  Events.GuildMemberAdd,
  false,
  async (botClient: BotClient, member: GuildMember) => {
    if (!member || !member.guild) return;

    const guild = member.guild;

    const settings = await botClient.database.guild.findUnique({
      where: {
        discordId: guild.id,
      },
      select: {
        autoRole: true,
      },
    });

    if (settings?.autoRole.length) {
      const roles: Role[] = settings.autoRole
        .map((roleId) => guild.roles.cache.get(roleId))
        .filter((role): role is Role => Boolean(role));

      await member.roles.add(roles);
    }
  },
);
