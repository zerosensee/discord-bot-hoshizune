# 🚀 Быстрый старт

## Самый простой способ:

### Windows:
```bash
.\start-test.bat
```

### Mac/Linux:
```bash
chmod +x start-test.sh
./start-test.sh
```

---

## Если скрипты не работают, вручную:

1. **Открой PowerShell/Terminal в папке проекта**

2. **Запусти PostgreSQL:**
```bash
docker-compose -f docker-compose.test.yml up -d
```

3. **Подожди 3 секунды**, потом:
```bash
yarn install
yarn deploy
yarn dev
```

4. **Готово!** Бот должен подключиться к Discord

---

## После запуска:

- Добавь бота на сервер через [этот линк](https://discord.com/api/oauth2/authorize?client_id=1496947520377716868&permissions=268435456&scope=bot%20applications.commands)
- Используй `/reaction-roles` команду
- Для выключения бота: `Ctrl+C` в терминале

---

📖 Подробно в `DOCKER_SETUP.md`
