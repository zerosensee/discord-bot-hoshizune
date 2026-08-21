@echo off
echo [1/3] Starting Full Stack in Docker...
docker-compose -f docker-compose.full.yml up -d --build

echo.
echo [2/3] Waiting for services to initialize...
timeout /t 5

echo.
echo [3/3] Checking logs...
docker logs -f hoshizune-bot-full
