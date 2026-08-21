import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  InteractionContextType,
  InteractionResponse,
  Message,
  MessageComponentInteraction,
  MessageFlags,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
} from 'discord.js';

import { SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';
import { COLORS, EMOJIS } from '@/shared/constants';

export default class AutoRoleCommand extends SlashCommand {
  public constructor() {
    super(
      new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Auto role settings')
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
    await interaction.deferReply();

    if (!interaction.inGuild()) return;

    const guild = await botClient.database.guild.findUnique({
      where: {
        discordId: interaction.guildId,
      },
      select: {
        autoRole: true,
      },
    });
    const existingRoles = guild?.autoRole ?? [];

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription(
        `### ${EMOJIS.SHIELD} Auto role settings\n<@${interaction.user.id}>, please select roles to assignment`,
      )
      .setThumbnail(interaction.user.displayAvatarURL());

    if (existingRoles.length > 0) {
      embed.addFields({
        name: '> Roles',
        value: existingRoles.map((roleId) => `<@&${roleId}>`).join(', '),
      });
    }

    const menu = new RoleSelectMenuBuilder()
      .setCustomId('setAutoRole')
      .setPlaceholder('Select roles to assignment')
      .setMinValues(0)
      .setMaxValues(10)
      .setDefaultRoles(existingRoles);
    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      menu,
    );

    const message = (await interaction.editReply({
      embeds: [embed],
      components: [row],
    })) as Message;

    const collector = message.createMessageComponentCollector({
      time: 2.5 * 60 * 1000,
    });

    collector.on(
      'collect',
      async (componentInteraction: MessageComponentInteraction) => {
        if (componentInteraction.user.id !== interaction.user.id) return;

        if (
          componentInteraction.isRoleSelectMenu() &&
          componentInteraction.customId === 'setAutoRole'
        ) {
          const roles = componentInteraction.values;
          const hasForbiddenRoles = roles.some((roleId) => {
            const role = componentInteraction.guild!.roles.cache.get(roleId);
            return role?.permissions.has(PermissionFlagsBits.Administrator);
          });

          if (hasForbiddenRoles) {
            await componentInteraction.reply({
              content:
                'You selected a role with admin permissions. This is not allowed',
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          await botClient.database.guild.update({
            where: {
              discordId: componentInteraction.guildId!,
            },
            data: {
              autoRole: roles,
            },
          });

          const updatedEmbed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setDescription(
              `### ${EMOJIS.SHIELD} Auto role settings\n<@${interaction.user.id}>, please select roles to assignment`,
            )
            .setThumbnail(interaction.user.displayAvatarURL());

          if (roles.length > 0) {
            updatedEmbed.addFields({
              name: '> Roles',
              value: roles.map((roleId) => `<@&${roleId}>`).join(', '),
            });
          }

          const updatedMenu = new RoleSelectMenuBuilder()
            .setCustomId('setAutoRole')
            .setPlaceholder('Select roles to assignment')
            .setMinValues(0)
            .setMaxValues(10)
            .setDefaultRoles(roles);

          const updatedRow =
            new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
              updatedMenu,
            );

          await componentInteraction.update({
            embeds: [updatedEmbed],
            components: [updatedRow],
          });
        }
      },
    );

    collector.on('end', () => {
      const disabledMenu = new RoleSelectMenuBuilder()
        .setCustomId('setAutoRole')
        .setDisabled(true);
      const disabledRow =
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          disabledMenu,
        );

      message.edit({ components: [disabledRow] });
    });
  }
}
