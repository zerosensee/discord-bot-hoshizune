# 📌 Пошаговая инструкция для Windows (с картинками в коде)

## Этап 1: Установка Docker Desktop

### Шаг 1 - Скачай Docker
- Перейди на https://www.docker.com/products/docker-desktop
- Скачай версию для Windows
- Запусти установщик (двойной клик)

### Шаг 2 - Установка
```
Docker Desktop Installer
├─ Принимаю условия лицензии ✓
├─ Выбираю установку по умолчанию
└─ Нажимаю "Install"
     ↓
  Идет установка... (может занять несколько минут)
     ↓
  "Installation successful"
```

### Шаг 3 - Перезагрузка и запуск
- Перезагрузи ПК (если попросит)
- Docker Desktop запустится автоматически
- Ищи значок кита 🐳 в трее (нижний правый угол)

### Проверка (откроем PowerShell и проверим):
```powershell
docker --version
docker-compose --version

# Должны вывести версии:
# Docker version 27.0.0
# Docker Compose version 2.x.x
```

---

## Этап 2: Запуск бота

### Вариант А - Самый легкий (рекомендуется)

```
1. Открой папку проекта в Проводнике (D:\setting\Hoshizune-main)
   
2. Найди файл "start-test.bat"
   
3. Дважды клик на "start-test.bat"
   
4. Откроется черное окно (это нормально!)
   Должны увидеть текст:
   ✓ Starting PostgreSQL container for testing...
   ✓ Waiting for database to be ready...
   ✓ Installing dependencies...
   ✓ Applying database migrations...
   ✓ Starting bot in development mode...
   
5. Когда увидишь что-то типа:
   "Ready! Logged in as BotName#0000"
   → Бот готов! 🎉

6. Закрыть окно: Ctrl+C
```

### Вариант Б - Через PowerShell (если А не сработал)

```
1. Открой PowerShell в папке проекта
   (Shift + Правый клик → "Open PowerShell window here")
   
2. Выполни по очереди:

   # Запусти PostgreSQL в контейнере
   docker-compose -f docker-compose.test.yml up -d
   
   # Подожди 3 секунды...
   
   # Установи зависимости
   yarn install
   
   # Примени миграции БД
   yarn deploy
   
   # Запусти бота
   yarn dev

3. Когда видишь "Ready! Logged in as BotName#0000" → Готово!
```

---

## Этап 3: Проверка работы

### Docker работает?
```
Docker Desktop → иконка кита 🐳 в трее горит зеленым
```

### PostgreSQL запущен?
```powershell
docker ps

# Должно показать:
CONTAINER ID   IMAGE              NAMES
abc123def456   postgres:16-alpine hoshizune-postgres  ← вот это
```

### Бот запущен?
```
В PowerShell должна быть строчка:
✨ Ready! Logged in as Hoshizune#1234

И нет красных ошибок
```

---

## Этап 4: Тестирование на Discord

### 1. Добавь бота на сервер
Нажми на эту ссылку:
```
https://discord.com/api/oauth2/authorize?client_id=1496947520377716868&permissions=268435456&scope=bot%20applications.commands
```

### 2. Создай тестовое сообщение
```
На тестовом сервере напиши любое сообщение:
"Тестирование реакции роли"
(скопируй ID сообщения: нажми на сообщение → Copy Message Link → 
последние цифры в URL это ID)
```

### 3. Используй команду
```
На сервере напиши:
/reaction-roles

И следуй инструкциям:
1. Введи ID сообщения
2. Добавь эмодзи к этому сообщению (просто реакции)
3. Напиши роли: @Role1 @Role2

Готово! Реакции теперь выдают роли!
```

---

## Этап 5: Проблемы и решения

### ❌ Ошибка: "docker: command not found"
```
✅ Решение:
1. Переустанови Docker Desktop
2. Перезагрузи ПК
3. Откройся PowerShell заново
```

### ❌ Ошибка: "yarn: command not found"
```
✅ Решение:
npm install -g yarn
yarn --version
```

### ❌ Ошибка: "Port 5432 already in use"
```
✅ Решение:
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d
```

### ❌ Ошибка: "Cannot connect to database"
```
✅ Решение:
1. Проверь, запущен ли контейнер:
   docker ps
   
2. Если не видишь hoshizune-postgres, перезапусти:
   docker-compose -f docker-compose.test.yml up -d
```

### ❌ Docker Desktop не запускается
```
✅ Решение:
1. Включи Hyper-V в Windows:
   Панель управления → Программы → Включение или выключение 
   компонентов Windows → Hyper-V ✓
   
2. Перезагрузи ПК

3. Запусти Docker Desktop
```

---

## Этап 6: Остановка бота

```
В PowerShell (где работает бот):
Нажми Ctrl+C

Контейнер закроется автоматически
```

---

## 🎉 Готово!

Если всё сработало:
- ✅ Docker Desktop установлен
- ✅ PostgreSQL работает в контейнере
- ✅ Бот подключен к Discord
- ✅ Команда `/reaction-roles` работает

**Пиши `/reaction-roles` на сервере и тестируй!** 🚀
