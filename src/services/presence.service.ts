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
  private mixTimeout: NodeJS.Timeout | null = null;
  private isMixActive = false;
  private customActivities: ActivityItem[] = [];
  private currentActivity: ActivityItem | null = null;

  /**
   * Доступные индикаторы состояния сети.
   */
  private readonly networkStatuses: PresenceStatusData[] = [
    'online',
    'idle',
    'dnd',
    'invisible',
  ];

  /**
   * Каомодзи и кастомные текстовые статусы для Mix-режима.
   */
  private readonly kaomojiActivities: ActivityItem[] = [
    { id: 'kao_1', name: '¯\\_(ツ)_/¯', type: ActivityType.Custom },
    { id: 'kao_2', name: '(* ^ ω ^)', type: ActivityType.Custom },
    { id: 'kao_3', name: '(＾▽＾)', type: ActivityType.Custom },
    { id: 'kao_4', name: '🫸🔴🔵🫷🫴🟣', type: ActivityType.Custom },
  ];

  /**
   * Единственная стандартная активность (Стрим Yanima.space).
   */
  public readonly presets: ActivityItem[] = [
    {
      id: 'yanima_stream',
      name: 'Yanima.space',
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/yanimaspace',
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
      `Установлена активность: "${activity.name}" (Тип: ${activity.type})`,
    );
  }

  /**
   * Применение активности и индикатора сети в Discord Client.
   * @param activity - Объект активности
   * @param overrideStatus - Статус сети (online, idle, dnd, invisible)
   */
  private applyActivity(
    activity: ActivityItem,
    overrideStatus?: PresenceStatusData,
  ): void {
    if (!this.botClient.user) return;

    const isCustom = activity.type === ActivityType.Custom;
    const finalStatus = overrideStatus || activity.status || 'online';

    this.botClient.user.setPresence({
      activities: [
        {
          name: activity.name,
          type: activity.type,
          url: activity.url,
          state: isCustom ? activity.name : undefined,
        },
      ],
      status: finalStatus,
    });
  }

  /**
   * Запуск автоматического Mix-режима смены активностей и статусов сети.
   * Использует динамический интервал смены (5–30 секунд).
   */
  public startMixMode(): void {
    if (this.isMixActive) return;

    this.isMixActive = true;
    this.botClient.logger.info(
      '🔄 Запущен Mix-режим динамической смены активностей и статусов сети.',
    );

    this.scheduleNextMixTick();
  }

  /**
   * Планирование следующего шага ротации в Mix-режиме со случайной задержкой 5-30 сек.
   */
  private scheduleNextMixTick(): void {
    if (!this.isMixActive) return;

    this.rotateActivity();

    const randomDelay =
      Math.floor(Math.random() * (30000 - 5000 + 1)) + 5000;

    this.mixTimeout = setTimeout(() => {
      this.scheduleNextMixTick();
    }, randomDelay);
  }

  /**
   * Остановка Mix-режима.
   */
  public stopMixMode(): void {
    if (!this.isMixActive) return;

    if (this.mixTimeout) {
      clearTimeout(this.mixTimeout);
      this.mixTimeout = null;
    }
    this.isMixActive = false;
    this.botClient.logger.info('🛑 Mix-режим смены активностей остановлен.');
  }

  /**
   * Переключение состояния Mix-режима.
   * @returns Текущий флаг Mix-режима
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
   * Ротация случайной активности и индикатора сети из всех активностей (игры, стрим, каомодзи, свои).
   */
  public rotateActivity(): void {
    const fullPool = [
      ...this.presets,
      ...this.kaomojiActivities,
      ...this.customActivities,
    ];

    if (fullPool.length === 0) return;

    const randomActivity =
      fullPool[Math.floor(Math.random() * fullPool.length)];
    const randomStatus =
      this.networkStatuses[
        Math.floor(Math.random() * this.networkStatuses.length)
      ];

    this.applyActivity(randomActivity, randomStatus);
    this.currentActivity = randomActivity;
    this.botClient.logger.info(
      `[Mix-режим] Активность: "${randomActivity.name}" | Сеть: [${randomStatus}]`,
    );
  }

  /**
   * Добавление пользовательской активности.
   * @param name - Название активности
   * @param type - Тип активности
   * @param url - Ссылка на стрим
   * @param status - Статус сети
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
      `Добавлена своя активность: "${name}" (ID: ${customItem.id})`,
    );
    return customItem;
  }

  /**
   * Сброс активности бота к стандартному состоянию (Стрим Yanima.space, статус online).
   */
  public resetPresence(): void {
    this.stopMixMode();
    const defaultPreset = this.presets[0];
    if (defaultPreset) {
      this.setActivity(defaultPreset);
    } else if (this.botClient.user) {
      this.botClient.user.setPresence({
        activities: [],
        status: 'online',
      });
    }
    this.botClient.logger.info('Статус активности бота сброшен к стандартному.');
  }

  /**
   * Получение состояния Mix-режима.
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
