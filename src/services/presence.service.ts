import { ActivityType, PresenceStatusData } from 'discord.js';

import { BotClient } from '@/bot-client';

/**
 * Описание структуры элемента активности бота.
 */
export interface ActivityItem {
  id: string;
  name: string;
  type: ActivityType;
  url?: string;
  status?: PresenceStatusData;
}

/**
 * Сервис управления динамическими активностями и присутствием бота Hoshizune.
 */
export class PresenceService {
  private readonly botClient: BotClient;
  private mixTimer: NodeJS.Timeout | null = null;
  private isMixActive = false;
  private customActivities: ActivityItem[] = [];
  private currentActivity: ActivityItem | null = null;

  /**
   * Предустановленный набор популярных игр и системных активностей.
   */
  public readonly presets: ActivityItem[] = [
    {
      id: 'dota2',
      name: 'Dota 2',
      type: ActivityType.Playing,
    },
    {
      id: 'cs2',
      name: 'Counter-Strike 2',
      type: ActivityType.Playing,
    },
    {
      id: 'pubg',
      name: 'PUBG: BATTLEGROUNDS',
      type: ActivityType.Playing,
    },
    {
      id: 'minecraft',
      name: 'Minecraft',
      type: ActivityType.Playing,
    },
    {
      id: 'gta5',
      name: 'Grand Theft Auto V',
      type: ActivityType.Playing,
    },
    {
      id: 'genshin',
      name: 'Genshin Impact',
      type: ActivityType.Playing,
    },
    {
      id: 'valorant',
      name: 'VALORANT',
      type: ActivityType.Playing,
    },
    {
      id: 'league',
      name: 'League of Legends',
      type: ActivityType.Playing,
    },
    {
      id: 'radio',
      name: 'Hoshizune Radio 🎵',
      type: ActivityType.Listening,
    },
    {
      id: 'anime',
      name: 'Аниме новинки 📺',
      type: ActivityType.Watching,
    },
    {
      id: 'twitch_live',
      name: 'Hoshizune Live Stream 🟣',
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/hoshizune',
    },
    {
      id: 'servers',
      name: 'за серверами Hoshizune 🌐',
      type: ActivityType.Watching,
    },
  ];

  public constructor(botClient: BotClient) {
    this.botClient = botClient;
  }

  /**
   * Установка фиксированной активности для бота.
   * @param activity - Объект активности
   */
  public setActivity(activity: ActivityItem): void {
    this.stopMixMode();
    this.applyActivity(activity);
    this.currentActivity = activity;
    this.botClient.logger.info(
      `Установлена активная деятельность бота: "${activity.name}" (Тип: ${activity.type})`,
    );
  }

  /**
   * Применение активности к клиенту Discord.
   * @param activity - Объект активности
   */
  private applyActivity(activity: ActivityItem): void {
    if (!this.botClient.user) return;

    this.botClient.user.setPresence({
      activities: [
        {
          name: activity.name,
          type: activity.type,
          url: activity.url,
        },
      ],
      status: activity.status || 'online',
    });
  }

  /**
   * Включение автоматического Mix-режима случайной смены активностей.
   * Смена происходит раз в 10 минут во избежание лимитов Discord API.
   */
  public startMixMode(): void {
    if (this.isMixActive) return;

    this.isMixActive = true;
    this.botClient.logger.info(
      'Запущен автоматический Mix-режим регулярной смены активностей бота.',
    );

    this.rotateActivity();

    this.mixTimer = setInterval(() => {
      this.rotateActivity();
    }, 10 * 60 * 1000);
  }

  /**
   * Остановка Mix-режима смены активностей.
   */
  public stopMixMode(): void {
    if (!this.isMixActive) return;

    if (this.mixTimer) {
      clearInterval(this.mixTimer);
      this.mixTimer = null;
    }
    this.isMixActive = false;
    this.botClient.logger.info(
      'Автоматический Mix-режим смены активностей остановлен.',
    );
  }

  /**
   * Переключение состояния Mix-режима.
   * @returns Флаг активности Mix-режима
   */
  public toggleMixMode(): boolean {
    if (this.isMixActive) {
      this.stopMixMode();
    } else {
      this.startMixMode();
    }
    return this.isMixActive;
  }

  /**
   * Ротация случайной активности из пула предустановленных и пользовательских активностей.
   */
  public rotateActivity(): void {
    const allPool = [...this.presets, ...this.customActivities];
    if (allPool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * allPool.length);
    const selected = allPool[randomIndex];

    this.applyActivity(selected);
    this.currentActivity = selected;
    this.botClient.logger.info(
      `[Mix-режим] Автоматическая смена активности на: "${selected.name}"`,
    );
  }

  /**
   * Добавление пользовательской активности в систему.
   * @param name - Название активности
   * @param type - Тип активности
   * @param url - Ссылка для стриминга (необязательно)
   * @param status - Статус присутствия
   * @returns Созданный объект активности
   */
  public addCustomActivity(
    name: string,
    type: ActivityType,
    url?: string,
    status?: PresenceStatusData,
  ): ActivityItem {
    const customItem: ActivityItem = {
      id: `custom_${Date.now()}`,
      name,
      type,
      url,
      status,
    };

    this.customActivities.push(customItem);
    this.setActivity(customItem);
    this.botClient.logger.info(
      `Добавлена пользовательская активность: "${name}" (ID: ${customItem.id})`,
    );
    return customItem;
  }

  /**
   * Сброс активности бота к стандартному состоянию.
   */
  public resetPresence(): void {
    this.stopMixMode();
    this.currentActivity = null;
    if (this.botClient.user) {
      this.botClient.user.setPresence({
        activities: [],
        status: 'online',
      });
    }
    this.botClient.logger.info('Статус активности бота успешно сброшен.');
  }

  /**
   * Получение текущего состояния Mix-режима.
   */
  public getIsMixActive(): boolean {
    return this.isMixActive;
  }

  /**
   * Получение текущей выбранной активности бота.
   */
  public getCurrentActivity(): ActivityItem | null {
    return this.currentActivity;
  }
}
