@echo off
echo [1/1] Refreshing Discord commands...
docker exec hoshizune-bot-full yarn rest
echo.
echo Done!
pause
