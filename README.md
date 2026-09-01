# 🤖 discord-bot-hoshizune

Discord бот на TypeScript с поддержкой выдачи ролей по эмодзи реакциям, автовыдачей ролей, расширенной статистикой и изолированной архитектурой базы данных.

## ✨ Функции

- 🎯 **Автоматическая выдача ролей новым участникам** (`/autorole`)
- 😊 **Выдача ролей по эмодзи реакциям** (`/reaction-roles`) 
- 📈 **Статистика сервера** (`/stats`)
- 🖼️ **Информация об аватаре** (`/avatar`)
- 📊 **Статус бота** (`/ping`, `/about`)
- 🐱 **Рандомные кошечки** (`/nekos`)

## 🗃️ Изолированная База Данных

- 🔒 **Изоляция порт-маппинга:** Стандартный порт PostgreSQL изменен на **2406** (`POSTGRES_PORT=2406`), что исключает конфликты с имеющимися базами данных на сервере.
- 🛡️ **Изоляция таблиц:** Таблицы в базе данных создаются с префиксом `hoshizune_` (`hoshizune_guilds`, `hoshizune_reaction_role_messages`, `hoshizune_channel_stats`).
- ⚡ **Индексы и производительность:** Добавлены индексы по серверам, каналам и датам для быстрой обработки аналитики и реакций.

## 📖 Документация

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Архитектура и процессы
- **[COMMANDS.md](./COMMANDS.md)** - Полезные команды

## ⚡ Быстрый запуск

### 1. Через Docker (PostgreSQL на порте 2406)

```bash
docker-compose up -d --build
```

### 2. Локальный запуск

```bash
cp .env.example .env
yarn install
yarn deploy
yarn dev
```

## 📋 Конфигурация

Создай `.env` файл на основе `.env.example`:
```env
DISCORD_TOKEN=бот_токен
CLIENT_ID=бот_id
POSTGRES_PORT=2406
DATABASE_URL="postgresql://postgres:postgres@localhost:2406/discord_bot_hoshizune?schema=public"
```

discord-bot-hoshizune - 2026
