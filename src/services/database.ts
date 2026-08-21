// Импорты сторонних библиотек
import { Prisma, PrismaClient } from '@prisma/generated';

// Локальные импорты проекта
import { createLogger } from '@/utils';

/**
 * Интерфейс управления жизненным циклом подключения к базе данных.
 */
export interface IDatabaseService {
  /**
   * Выполняет подключение к базе данных.
   */
  connect(): Promise<void>;

  /**
   * Безопасно завершает соединение с базой данных.
   */
  disconnect(): Promise<void>;

  /**
   * Проверяет работоспособность подключения к базе данных (health-check).
   * @returns true, если база данных отвечает на запросы, иначе false.
   */
  ping(): Promise<boolean>;
}

/**
 * Класс управления подключением и операциями с базой данных PostgreSQL/SQLite.
 * Реализует паттерн Одиночка (через экспорт сервиса) и принципы SOLID.
 */
export class Database
  extends PrismaClient<Prisma.PrismaClientOptions, 'error' | 'info' | 'warn'>
  implements IDatabaseService
{
  /**
   * Экземпляр логгера для фиксации событий базы данных на русском языке.
   */
  private readonly logger = createLogger('БазаДанных');

  /**
   * Флаг, предотвращающий повторные параллельные попытки переподключения.
   */
  private isReconnecting: boolean = false;

  /**
   * Конструктор инициализирует клиент Prisma и подписывается на системные события.
   */
  public constructor() {
    super({
      log: (['info', 'warn', 'error'] as Prisma.LogLevel[]).map(
        (level: Prisma.LogLevel) => ({
          level,
          emit: 'event',
        }),
      ),
    });

    this.logger.info(
      'Инициализация сервиса базы данных discord-bot-hoshizune...',
    );
    this.setupEventListeners();
  }

  /**
   * Выполняет первоначальное подключение к базе данных.
   */
  public async connect(): Promise<void> {
    this.logger.info('Установка соединения с базой данных...');
    try {
      await this.$connect();
      this.logger.info(
        'Соединение с базой данных discord-bot-hoshizune успешно установлено.',
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Критическая ошибка при подключении к базе данных: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Корректно завершает работу с базой данных.
   */
  public async disconnect(): Promise<void> {
    this.logger.info('Закрытие соединения с базой данных...');
    try {
      await this.$disconnect();
      this.logger.info('Соединение с базой данных успешно закрыто.');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Ошибка при закрытии соединения с базой данных: ${errorMessage}`,
      );
    }
  }

  /**
   * Выполняет тестовый запрос для проверки доступности СУБД.
   */
  public async ping(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      this.logger.info('Проверка соединения с базой данных прошла успешно.');
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Проверка состояния базы данных завершилась ошибкой: ${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * Настройка подписок на события логирования Prisma.
   */
  private setupEventListeners(): void {
    this.$on('info', (event: Prisma.LogEvent) => {
      this.logger.info(`Prisma Информация: ${event.message}`);
    });

    this.$on('warn', (event: Prisma.LogEvent) => {
      this.logger.warn(`Prisma Предупреждение: ${event.message}`);
    });

    this.$on('error', (event: Prisma.LogEvent) => {
      this.logger.error(`Prisma Ошибка: ${event.message}`);

      if (event.message.includes('connection')) {
        void this.handleDisconnect();
      }
    });
  }

  /**
   * Автоматическое переподключение к базе данных при разрыве связи.
   */
  private async handleDisconnect(): Promise<void> {
    if (this.isReconnecting) {
      this.logger.warn(
        'Процесс переподключения уже запущен, ожидание завершения...',
      );
      return;
    }

    this.isReconnecting = true;
    this.logger.warn(
      'Обнаружен разрыв соединения с базой данных. Запуск цикла переподключения...',
    );

    let attemptCount: number = 0;
    const maxDelayMs: number = 10000;

    while (this.isReconnecting) {
      attemptCount += 1;
      const delayMs: number = Math.min(1000 * attemptCount, maxDelayMs);

      this.logger.info(
        `Попытка восстановления соединения №${attemptCount} через ${delayMs / 1000} сек...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      try {
        await this.$connect();
        this.logger.info(
          `Соединение с базой данных успешно восстановлено на попытке №${attemptCount}!`,
        );
        this.isReconnecting = false;
        break;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Попытка №${attemptCount} не удалась: ${errorMessage}`,
        );
      }
    }
  }
}
