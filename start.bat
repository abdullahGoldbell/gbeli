@echo off
REM ── FMS Dashboard - Windows Startup Script ──
cd /d "%~dp0"

echo Building Next.js for production...
call npx next build
if %ERRORLEVEL% neq 0 (
    echo Build failed! Exiting.
    pause
    exit /b 1
)

echo.
echo Starting FMS Dashboard with PM2 (runs 24/7)...
call pm2 start ecosystem.config.js
call pm2 save

echo.
echo ================================================
echo   FMS Dashboard is running 24/7!
echo   Dashboard: http://localhost:3005
echo   Socket.io: http://localhost:3001
echo.
echo   Users access via: http://YOUR_SERVER_IP:3005
echo.
echo   PM2 Commands:
echo     pm2 status        - Check status
echo     pm2 logs           - View logs
echo     pm2 restart all    - Restart servers
echo     pm2 stop all       - Stop servers
echo ================================================
echo.
pause
