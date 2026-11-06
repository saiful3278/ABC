@echo off
cd /d "%~dp0"
echo Starting Node.js Backend on port 5001...
set PORT=5001
node server.js
