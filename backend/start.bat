@echo off
cd /d "%~dp0"
echo Starting Node.js Backend...
start "Remote Scrcpy Backend" cmd /c "node server.js"

echo Starting Cloudflare Tunnel on port 22533...
cloudflared tunnel --url http://localhost:22533
