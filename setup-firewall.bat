@echo off
REM ── Run this ONCE as Administrator to allow network access ──
echo Opening firewall ports for FMS Dashboard...

netsh advfirewall firewall add rule name="FMS Dashboard - Next.js (3005)" dir=in action=allow protocol=tcp localport=3005
netsh advfirewall firewall add rule name="FMS Dashboard - Socket.io (3001)" dir=in action=allow protocol=tcp localport=3001

echo.
echo Firewall rules added. Users can now access the dashboard.
echo.
pause
