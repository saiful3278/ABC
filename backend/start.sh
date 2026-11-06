#!/bin/bash
cd "$(dirname "$0")"

echo "Starting Node.js Backend..."
PORT=5001 node server.js &
NODE_PID=$!

echo "Starting Cloudflare Tunnel as additional connector..."
cloudflared tunnel run --token eyJhIjoiOTMwZDg4ODBhOTAyOGY4ZDBlOGMyM2Y0YWFkYmIwNzUiLCJ0IjoiMjM5OGU1YzAtMTYxOC00NDA1LWJhMDAtMmM3YWY1ODc4YWU4IiwicyI6Ik56RXdZV1ExTkRBdFl6UTRNUzAwTXpFekxUaGlZMk10TWpNNE9URXdOVEU1TXpZMCJ9

# Cleanup if cloudflared is stopped
kill $NODE_PID
