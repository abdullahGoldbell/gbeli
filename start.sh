#!/bin/bash
# Start FMS Dashboard - both Next.js and Socket.io servers
cd "$(dirname "$0")"

echo "Starting Socket.io server on port 3001..."
node server.js &
SOCKET_PID=$!

echo "Starting Next.js dev server on port 3000..."
npx next dev -H 0.0.0.0 &
NEXT_PID=$!

echo ""
echo "FMS Dashboard is running!"
echo "  Dashboard: http://localhost:3000"
echo "  Socket.io: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $SOCKET_PID $NEXT_PID 2>/dev/null; exit" INT TERM
wait
