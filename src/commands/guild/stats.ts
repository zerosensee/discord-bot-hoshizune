import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';

import { SlashCommand } from '@/base';
import { BotClient } from '@/bot-client';

/**
 * Команда для управления и просмотра статистики сервера.
 */
export default class StatsCommand extends SlashCommand {
  public constructor() {
    super(
      new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Управление статистикой сервера')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) =>
          subcommand
            .setName('setup')
            .setDescription('Настройка канала для ежедневных отчетов')
            .addChannelOption((option) =>
              option
                .setName('channel')
                .setDescription('Канал для отправки ежедневных отчетов')
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('query')
            .setDescription('Получить статистику за указанный период')
            .addIntegerOption((option) =>
              option
                .setName('days')
                .setDescription('Количество дней для анализа')
                .setMinValue(1),
            ),
        ) as SlashCommandBuilder,
    );
  }

  public async chatInput(
    botClient: BotClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const channel = interaction.options.getChannel('channel', true);

      if (!(channel instanceof TextChannel)) {
        await interaction.reply({
          content: '❌ Выбранный канал должен быть текстовым.',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      // Сохраняем ID канала в базу данных
      await botClient.database.guild.upsert({
        where: { discordId: interaction.guildId! },
        update: { statsChannelId: channel.id },
        create: {
          discordId: interaction.guildId!,
          statsChannelId: channel.id,
          autoRole: [],
        },
      });

      await interaction.reply({
        content: `✅ Канал для ежедневной статистики успешно установлен: ${channel}`,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (subcommand === 'query') {
      await interaction.deferReply();
      const days = interaction.options.getInteger('days') ?? 1;

      try {
        const embed = await botClient.statsService.getStatsEmbed(
          interaction.guild!,
          days,
        );
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        botClient.logger.error('Failed to generate stats query report', error);
        await interaction.editReply({
          content: '❌ Произошла ошибка при формировании отчета статистики.',
        });
      }
    }
  }
}
