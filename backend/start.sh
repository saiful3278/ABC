#!/bin/bash
cd "$(dirname "$0")"

echo "Starting Node.js Backend..."
node server.js &
NODE_PID=$!

echo "Starting Cloudflare Tunnel (deamon.338566.xyz)..."
cloudflared tunnel run deamon

# Cleanup if cloudflared is stopped
kill $NODE_PID
