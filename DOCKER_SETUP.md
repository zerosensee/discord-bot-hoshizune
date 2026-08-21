# 🐳 Docker Desktop - Инструкция по запуску

## 1. Установка Docker Desktop

### Windows/Mac:
1. Скачай [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Запусти установщик и следуй инструкциям
3. Перезагрузи компьютер
4. Docker Desktop запустится автоматически

### Проверка установки:
```bash
docker --version
docker-compose --version
```

Должны вывести версии обеих команд.

---

## 2. Запуск PostgreSQL для тестирования

### Вариант 1️⃣ (Рекомендуется) - Автоматически через скрипт:

**Windows:**
```bash
.\start-test.bat
```

**Mac/Linux:**
```bash
chmod +x start-test.sh
./start-test.sh
```

Скрипт сделает всё автоматически:
- ✅ Запустит PostgreSQL контейнер
- ✅ Установит зависимости (`yarn install`)
- ✅ Применит миграции БД (`yarn deploy`)
- ✅ Запустит бота (`yarn dev`)

---

### Вариант 2️⃣ - Вручную (если скрипт не сработает):

#### Шаг 1: Запусти PostgreSQL контейнер
```bash
docker-compose -f docker-compose.test.yml up -d
```

Вывод должен быть примерно таким:
```
[+] Running 2/2
 ✔ Network hoshizune_default Created
 ✔ Container hoshizune-postgres Started
```

#### Шаг 2: Проверь, что контейнер запустился
```bash
docker ps
```

Должен показать:
```
CONTAINER ID   IMAGE                PORTS                    NAMES
abc123def456   postgres:16-alpine   0.0.0.0:5432->5432/tcp  hoshizune-postgres
```

#### Шаг 3: Установи зависимости
```bash
yarn install
```

#### Шаг 4: Примени миграции БД
```bash
yarn deploy
```

#### Шаг 5: Запусти бота
```bash
yarn dev
```

---

## 3. Управление контейнером

### Просмотр запущенных контейнеров:
```bash
docker ps
```

### Остановить контейнер:
```bash
docker-compose -f docker-compose.test.yml down
```

### Удалить контейнер и данные:
```bash
docker-compose -f docker-compose.test.yml down -v
```

### Просмотр логов PostgreSQL:
```bash
docker logs hoshizune-postgres
```

### Подключиться к БД напрямую:
```bash
docker exec -it hoshizune-postgres psql -U postgres -d hoshizune_test
```

---

## 4. Docker Desktop GUI (через интерфейс)

Если скрипты не работают, можешь использовать GUI:

1. Открой **Docker Desktop** (иконка кита в трее)
2. Перейди на вкладку **Containers**
3. Нажми кнопку **+** или используй **docker-compose**
4. Выбери `docker-compose.test.yml`

Или просто открой терминал и выполни команды выше.

---

## 5. Если что-то пошло не так

### Ошибка: "Cannot connect to database"
```bash
# Проверь, запущен ли контейнер
docker ps

# Перезапусти
docker-compose -f docker-compose.test.yml restart
```

### Ошибка: "Port 5432 already in use"
```bash
# Проверь, не занят ли порт
# Либо измени порт в docker-compose.test.yml на другой (5433, 5434 и т.д.)

# Или останови старый контейнер
docker-compose -f docker-compose.test.yml down
```

### Ошибка: "yarn: command not found"
```bash
# Установи yarn глобально
npm install -g yarn

# Проверь версию
yarn --version
```

---

## 6. Готово! 🎉

После запуска бот должен:
- ✅ Подключиться к Discord серверу
- ✅ Загрузить все команды
- ✅ Быть готовым к тестированию команды `/reaction-roles`

Пиши если что-то не получится!
