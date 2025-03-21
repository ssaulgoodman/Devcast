#!/bin/bash

# Display a banner
echo "==============================================="
echo "    DevCast Integrated Development Server     "
echo "==============================================="
echo "Starting Next.js + Telegram bot in one process"
echo ""

# Check if port 3000 is in use and kill the process if needed
PORT_CHECK=$(lsof -i :3000 | grep LISTEN)
if [ ! -z "$PORT_CHECK" ]; then
  echo "Port 3000 is already in use. Cleaning up..."
  PID=$(echo "$PORT_CHECK" | awk '{print $2}')
  echo "Killing process $PID..."
  kill -9 $PID
  sleep 1
  echo "Port 3000 freed."
fi

# Start the integrated server
echo "Starting integrated server..."
node server.js

# The script shouldn't reach here unless there's an error
# since the server process keeps running
echo "Server stopped." 