# 🚀 Быстрый старт (SQLite - БЕЗ Docker!)

## Без установки Docker!

SQLite встроена в Node.js, поэтому нужна только установка зависимостей.

---

## Способ 1️⃣ - Через PowerShell (Windows)

1. **Открой PowerShell в папке проекта**
   - `Win+X` → выбери PowerShell
   - Или `Shift+ПКМ` в папке → PowerShell

2. **Выполни команды по очереди:**

```powershell
# Установи зависимости
yarn install

# Примени миграции БД (создаст SQLite файл)
yarn deploy

# Запусти бота
yarn dev
```

3. **Готово!** Должно показать:
```
✨ Ready! Logged in as Hoshizune#...
```

---

## Способ 2️⃣ - Через Git Bash (Mac/Linux)

```bash
# Установи зависимости
yarn install

# Примени миграции
yarn deploy

# Запусти бота
yarn dev
```

---

## Что создалось

Файл БД создается автоматически: `prisma/dev.db`

Это обычный SQLite файл, содержит все таблицы и данные.

---

## Использование

```bash
# Запуск в режиме разработки (перезагружается при изменении кода)
yarn dev

# Запуск бота в production
yarn start

# Просмотр БД (визуальный редактор)
npx prisma studio

# Сброс БД (удалит все данные!)
npx prisma migrate reset
```

---

## Добавление бота на сервер

```
https://discord.com/api/oauth2/authorize?client_id=1496947520377716868&permissions=268435456&scope=bot%20applications.commands
```

Затем используй `/reaction-roles` команду!

---

## Проблемы

| Ошибка | Решение |
|--------|---------|
| "yarn: command not found" | `npm install -g yarn` |
| "Cannot find module" | `yarn install` |
| "Database is locked" | Закрой другие процессы, запусти `yarn dev` заново |
| Нет прав на запуск | На Windows: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

Готово! Никаких Docker, контейнеров - просто SQLite файл! 🎉
