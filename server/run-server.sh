#!/bin/bash

# Chess Eval Server Startup Script

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting Chess Eval Server on port 3001..."
echo "Make sure the Java engine server is also running (cd ../engine && ./run-server.sh)"
echo ""

node index.js



