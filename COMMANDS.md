# 💡 Полезные команды и советы

## Docker команды

### Контейнеры

```bash
# Запустить контейнер в фоне
docker-compose -f docker-compose.test.yml up -d

# Остановить контейнер
docker-compose -f docker-compose.test.yml down

# Остановить и удалить данные
docker-compose -f docker-compose.test.yml down -v

# Перезагрузить контейнер
docker-compose -f docker-compose.test.yml restart

# Просмотр запущенных контейнеров
docker ps

# Просмотр всех контейнеров (включая остановленные)
docker ps -a

# Просмотр логов контейнера
docker logs hoshizune-postgres
docker logs -f hoshizune-postgres  # Live режим (выход Ctrl+C)

# Просмотр статистики контейнера
docker stats hoshizune-postgres

# Удалить контейнер
docker rm hoshizune-postgres

# Очистить неиспользуемые образы
docker image prune -a
```

---

## PostgreSQL команды

### Подключение к БД

```bash
# Подключиться в интерактивный режим
docker exec -it hoshizune-postgres psql -U postgres -d hoshizune_test

# Если в PSQL, вот полезные команды:
\dt                    # Показать все таблицы
\d guilds              # Показать структуру таблицы guilds
SELECT * FROM guilds;  # Показать все гильдии
\q                     # Выход из PSQL
```

### SQL запросы (через Docker)

```bash
# Показать все гильдии
docker exec hoshizune-postgres psql -U postgres -d hoshizune_test -c "SELECT * FROM guilds;"

# Показать все маппинги реакций
docker exec hoshizune-postgres psql -U postgres -d hoshizune_test -c "SELECT * FROM reaction_role_messages;"

# Удалить все данные (осторожно!)
docker exec hoshizune-postgres psql -U postgres -d hoshizune_test -c "TRUNCATE TABLE reaction_role_messages;"
```

---

## Yarn/npm команды

```bash
# Установка зависимостей
yarn install
npm install

# Запуск в режиме разработки (с автоперезагрузкой)
yarn dev
npm run dev

# Запуск в режиме REST (только регистрация команд)
yarn rest
npm run rest

# Применить миграции БД
yarn deploy
npm run deploy

# Сборка проекта
yarn build
npm run build

# Запуск в production
yarn start
npm start

# Форматирование кода
yarn pretty
npm run pretty

# Проверка lint
yarn lint
npm run lint
```

---

## Prisma команды

```bash
# Создать новую миграцию
npx prisma migrate dev --name add_new_table

# Применить миграции (то же что yarn deploy)
npx prisma migrate deploy

# Сброс БД (удалит всё! осторожно)
npx prisma migrate reset

# Запустить Prisma Studio (визуальный редактор БД)
npx prisma studio

# Генерировать Prisma client
npx prisma generate

# Проверить schema
npx prisma validate
```

---

## Git команды

```bash
# Проверить статус
git status

# Посмотреть diff
git diff

# Добавить файлы
git add .

# Создать коммит
git commit -m "твое сообщение"

# Отправить на сервер
git push

# Обновить локальный репо
git pull

# Просмотр истории
git log --oneline -10
```

---

## Процесс разработки

### Если ты хочешь работать над новой фичей:

```bash
# 1. Создай новую ветку
git checkout -b feature/my-feature

# 2. Сделай изменения
# (пиши код)

# 3. Проверь, что всё работает
yarn dev

# 4. Форматируй код
yarn pretty

# 5. Добавь изменения
git add .

# 6. Коммит
git commit -m "feat: add my feature"

# 7. Отправь на сервер
git push origin feature/my-feature

# 8. Создай Pull Request на GitHub
```

---

## Debouncing БД (если БД заблокирована)

```bash
# Останови все процессы
docker-compose -f docker-compose.test.yml down -v

# Удали volume с данными
docker volume rm hoshizune_postgres_data

# Начни заново
docker-compose -f docker-compose.test.yml up -d

# Переприменить миграции
yarn deploy
```

---

## Основные переменные окружения

```
DISCORD_APPLICATION_ID    # ID приложения из Discord Developer Portal
DISCORD_BOT_TOKEN         # Токен бота (KEEP SECRET! 🔐)
DATABASE_URL              # Строка подключения к PostgreSQL
NODE_ENV                  # development/production (автоматически)
```

---

## Полезные ссылки

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.js Docs](https://discord.js.org)
- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

---

## Советы и трюки

### 1. Просмотр всех миграций
```bash
ls prisma/migrations
```

### 2. Быстрое восстановление от ошибок
```bash
# Перезагрузи всё с нуля
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
yarn deploy
```

### 3. Проверка портов
```bash
# Какой процесс слушает порт 5432?
netstat -ano | findstr :5432  # Windows
lsof -i :5432                 # Mac/Linux
```

### 4. Просмотр размера БД
```bash
docker exec hoshizune-postgres psql -U postgres -d hoshizune_test -c "\l+"
```

### 5. Резервная копия БД
```bash
docker exec hoshizune-postgres pg_dump -U postgres -d hoshizune_test > backup.sql
```

### 6. Восстановление БД из резервной копии
```bash
docker exec -i hoshizune-postgres psql -U postgres -d hoshizune_test < backup.sql
```

---

## Когда что-то совсем сломалось

```bash
# Полный reset (удалит ВСЕ данные!)
docker-compose -f docker-compose.test.yml down -v
rm -rf node_modules
rm yarn.lock
yarn install
docker-compose -f docker-compose.test.yml up -d
yarn deploy
yarn dev
```

---

Happy coding! 🚀
