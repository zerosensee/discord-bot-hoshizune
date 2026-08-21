import { EmbedBuilder, Guild, TextChannel } from 'discord.js';

import { BotClient } from '@/bot-client';
import { COLORS, EMOJIS } from '@/shared/constants';

/**
 * Сервис для формирования и рассылки статистики сервера.
 */
export class StatsService {
  private lastReportDate: string | null = null;

  public constructor(private readonly botClient: BotClient) {}

  /**
   * Генерирует Embed со статистикой за указанный период.
   */
  public async getStatsEmbed(guild: Guild, days: number = 1): Promise<EmbedBuilder> {
    // Текущие показатели участников
    const totalMembers = guild.memberCount;
    const members = guild.members.cache;

    const onlineMembers = members.filter((m) => m.presence?.status === 'online')
      .size;
    const idleMembers = members.filter((m) => m.presence?.status === 'idle')
      .size;
    const dndMembers = members.filter((m) => m.presence?.status === 'dnd').size;
    const offlineMembers =
      totalMembers - (onlineMembers + idleMembers + dndMembers);

    const voiceMembers = guild.voiceStates.cache.size;

    // Получаем ID сервера в БД
    const dbGuild = await this.botClient.database.guild.findUnique({
      where: { discordId: guild.id },
      select: { id: true },
    });

    let messageStatsText = 'Данные о сообщениях отсутствуют за этот период.';

    if (dbGuild) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);

      // Группируем статистику по каналам за выбранный период
      const stats = await this.botClient.database.channelStats.groupBy({
        by: ['channelId'],
        where: {
          guildId: dbGuild.id,
          date: { gte: startDate },
        },
        _sum: { count: true },
      });

      if (stats.length > 0) {
        messageStatsText = stats
          .map((s) => {
            const channel = guild.channels.cache.get(s.channelId);
            const count = s._sum.count || 0;
            return `${channel ? `<#${channel.id}>` : `[${s.channelId}]`} - **${count}**`;
          })
          .join('\n');
      }
    }

    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.CHART} Статистика сервера: ${guild.name}`)
      .setDescription(`Период: **${days} ${this.getPluralDays(days)}**`)
      .addFields(
        {
          name: '👥 Участники',
          value: [
            `${EMOJIS.STATUS_ONLINE} В сети: **${onlineMembers}**`,
            `${EMOJIS.STATUS_IDLE} Не активен: **${idleMembers}**`,
            `${EMOJIS.STATUS_DND} Не беспокоить: **${dndMembers}**`,
            `${EMOJIS.STATUS_OFFLINE} Офлайн: **${offlineMembers}**`,
            `${EMOJIS.SHIELD} Всего: **${totalMembers}**`,
            `${EMOJIS.TYPE} В голосовых: **${voiceMembers}**`,
          ].join('\n'),
          inline: false,
        },
        {
          name: `${EMOJIS.PING} Сообщения в каналах`,
          value: messageStatsText,
          inline: false,
        },
      )
      .setTimestamp();
  }

  /**
   * Склонение слова "день" в зависимости от числа.
   */
  private getPluralDays(n: number): string {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней';
    if (lastDigit === 1) return 'день';
    if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
    return 'дней';
  }

  /**
   * Запускает цикл проверки для ежедневной рассылки.
   */
  public async startDailyReporting(): Promise<void> {
    // Проверка каждые 15 минут
    setInterval(() => this.processDailyReports(), 15 * 60 * 1000);
    // Первый запуск через 10 секунд после старта
    setTimeout(() => this.processDailyReports(), 10000);
  }

  /**
   * Логика проверки времени и отправки отчетов.
   */
  private async processDailyReports(): Promise<void> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Отправляем отчет, если наступил новый день (проверка в 00:xx)
    if (this.lastReportDate === dateStr || now.getHours() !== 0) return;

    this.botClient.logger.info('🚀 Starting automated daily stats distribution');

    const guildsWithStats = await this.botClient.database.guild.findMany({
      where: { statsChannelId: { not: null } },
      select: { discordId: true, statsChannelId: true },
    });

    for (const config of guildsWithStats) {
      try {
        const guild = this.botClient.guilds.cache.get(config.discordId);
        if (!guild || !config.statsChannelId) continue;

        const channel = guild.channels.cache.get(config.statsChannelId);
        if (!channel || !(channel instanceof TextChannel)) continue;

        const embed = await this.getStatsEmbed(guild, 1);
        await channel.send({
          content: '📈 **Ежедневный отчет по статистике**',
          embeds: [embed],
        });
      } catch (error) {
        this.botClient.logger.error(
          `Failed to send daily report to guild ${config.discordId}`,
          error,
        );
      }
    }

    this.lastReportDate = dateStr;
  }
}
