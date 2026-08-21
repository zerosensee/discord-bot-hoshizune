import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  InteractionContextType,
  InteractionResponse,
  PresenceStatusData,
  Role,
  SlashCommandBuilder,
} from 'discord.js';

import { SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';
import { COLORS, EMOJIS } from '@/shared/constants';

export default class ProfileCommand extends SlashCommand {
  public constructor() {
    super(
      new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Information about oneself or another user')
        .setContexts([InteractionContextType.Guild])
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Select a user to get their profile')
            .setRequired(false),
        ) as SlashCommandBuilder,
    );
  }

  public async chatInput(
    botClient: BotClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<InteractionResponse | void> {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member =
      (interaction.options.getMember('user') as GuildMember) ||
      (interaction.member as GuildMember) ||
      null;

    const status = (member.presence?.status ??
      'invisible') as PresenceStatusData;

    const statusEmojis: Record<PresenceStatusData, string> = {
      online: EMOJIS.STATUS_ONLINE,
      idle: EMOJIS.STATUS_IDLE,
      dnd: EMOJIS.STATUS_DND,
      invisible: EMOJIS.STATUS_OFFLINE,
    };
    const statusEmoji = statusEmojis[status] ?? statusEmojis.invisible;

    const userAvatar = targetUser.displayAvatarURL({ size: 512 });
    const userBanner = await targetUser
      .fetch()
      .then((user) => user.bannerURL({ size: 1024 }));

    const images: string[] = [];

    if (userAvatar) {
      images.push(`[Avatar](${userAvatar})`);
    }

    if (userBanner) {
      images.push(`[Banner](${userBanner})`);
    }

    const roles =
      member?.roles.cache
        .filter((role: Role) => role.id !== interaction.guild?.id)
        .map((role: Role) => role.toString()) || [];

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription(
        `### ${statusEmoji} ${targetUser.username}\n**Name:** <@${targetUser.id}>\n**Images:** ${images.length > 0 ? images.join(', ') : 'No images'}\n**Joined:** <t:${Math.floor(member.joinedTimestamp! / 1000)}>\n**Roles (${roles.length}):** ${roles.length > 0 ? roles.join(', ') : 'No'}`,
      )
      .setThumbnail(userAvatar)
      .setFooter({
        text: `ID: ${targetUser.id}`,
      })
      .setTimestamp(targetUser.createdTimestamp);

    await interaction.editReply({ embeds: [embed] });
  }
}
