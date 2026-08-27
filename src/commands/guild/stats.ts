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
            .setName('enable-disable')
            .setDescription('Включить или отключить ежедневную статистику')
            .addStringOption((option) =>
              option
                .setName('status')
                .setDescription('Выберите действие: Включить или Отключить')
                .setRequired(true)
                .addChoices(
                  { name: '🟢 Включить', value: 'enable' },
                  { name: '🔴 Отключить', value: 'disable' },
                ),
            )
            .addChannelOption((option) =>
              option
                .setName('channel')
                .setDescription('Канал для отправки отчетов (нужен при включении)')
                .setRequired(false),
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

    if (subcommand === 'enable-disable') {
      const statusAction = interaction.options.getString('status', true);
      const channel = interaction.options.getChannel('channel');

      if (statusAction === 'disable') {
        // Отключаем ежедневную статистику
        await botClient.database.guild.upsert({
          where: { discordId: interaction.guildId! },
          update: { statsChannelId: null },
          create: {
            discordId: interaction.guildId!,
            statsChannelId: null,
            autoRole: [],
          },
        });

        await interaction.reply({
          content: '🔴 Ежедневная статистика успешно **отключена** на сервере.',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      if (statusAction === 'enable') {
        if (!channel) {
          await interaction.reply({
            content:
              '⚠️ Для включения статистики укажите текстовый канал в поле `channel`.',
            flags: [MessageFlags.Ephemeral],
          });
          return;
        }

        if (!(channel instanceof TextChannel)) {
          await interaction.reply({
            content: '❌ Выбранный канал должен быть текстовым.',
            flags: [MessageFlags.Ephemeral],
          });
          return;
        }

        // Включаем статистику и сохраняем канал в базу данных
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
          content: `🟢 Ежедневная статистика **включена**. Канал для отчетов: ${channel}`,
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }
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
