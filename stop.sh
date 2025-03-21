#!/bin/bash

echo "==============================================="
echo "      DevCast Server Shutdown Utility         "
echo "==============================================="

# Check if Next.js is running on port 3000
NEXT_PROCESS=$(lsof -i :3000 | grep LISTEN)
if [ ! -z "$NEXT_PROCESS" ]; then
  NEXT_PID=$(echo "$NEXT_PROCESS" | awk '{print $2}')
  echo "Found Next.js server running on PID $NEXT_PID"
  echo "Stopping Next.js server..."
  kill -15 $NEXT_PID
  
  # Wait for process to end
  for i in {1..5}; do
    if ! ps -p $NEXT_PID > /dev/null; then
      echo "Next.js server stopped successfully."
      break
    fi
    echo "Waiting for process to end... ($i/5)"
    sleep 1
  done
  
  # Force kill if still running
  if ps -p $NEXT_PID > /dev/null; then
    echo "Process still running. Force killing..."
    kill -9 $NEXT_PID
    echo "Process forcefully terminated."
  fi
else
  echo "No Next.js server found running on port 3000."
fi

# Check for any server.js processes
SERVER_PROCESSES=$(ps aux | grep "[n]ode server.js")
if [ ! -z "$SERVER_PROCESSES" ]; then
  echo "Found additional server.js processes:"
  echo "$SERVER_PROCESSES"
  echo "Stopping these processes..."
  
  # Extract PIDs and kill them
  echo "$SERVER_PROCESSES" | awk '{print $2}' | xargs -I{} kill -15 {}
  sleep 2
  
  # Check if any remain and force kill them
  REMAINING=$(ps aux | grep "[n]ode server.js")
  if [ ! -z "$REMAINING" ]; then
    echo "Some processes still running. Force killing..."
    echo "$REMAINING" | awk '{print $2}' | xargs -I{} kill -9 {}
  fi
  
  echo "All server.js processes stopped."
else
  echo "No additional server.js processes found."
fi

# Check for standalone Telegram polling processes
TELEGRAM_PROCESSES=$(ps aux | grep "[s]tart-telegram-polling")
if [ ! -z "$TELEGRAM_PROCESSES" ]; then
  echo "Found standalone Telegram polling processes:"
  echo "$TELEGRAM_PROCESSES"
  echo "Stopping these processes..."
  
  # Extract PIDs and kill them
  echo "$TELEGRAM_PROCESSES" | awk '{print $2}' | xargs -I{} kill -15 {}
  sleep 2
  
  # Check if any remain and force kill them
  REMAINING=$(ps aux | grep "[s]tart-telegram-polling")
  if [ ! -z "$REMAINING" ]; then
    echo "Some Telegram processes still running. Force killing..."
    echo "$REMAINING" | awk '{print $2}' | xargs -I{} kill -9 {}
  fi
  
  echo "All Telegram polling processes stopped."
else
  echo "No standalone Telegram polling processes found."
fi

echo "Cleanup complete." 