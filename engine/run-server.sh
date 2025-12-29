#!/bin/bash
# Run the chess engine server

cd "$(dirname "$0")"

PORT=${1:-8765}

# Build if needed
if [ ! -d "out" ] || [ ! -f "out/chess/EngineServer.class" ]; then
    echo "Building..."
    ./build.sh
fi

echo "Starting Chess Engine Server on port $PORT..."
java -cp out chess.EngineServer $PORT

