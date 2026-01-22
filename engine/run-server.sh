#!/bin/bash
# Run the chess engine server

cd "$(dirname "$0")"

PORT=${1:-8765}

# Use Java 21 explicitly for consistency
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home")
export PATH="$JAVA_HOME/bin:$PATH"

# Build if needed
if [ ! -d "out" ] || [ ! -f "out/chess/EngineServer.class" ]; then
    echo "Building..."
    ./build.sh
fi

echo "Starting Chess Engine Server on port $PORT..."
java -cp out chess.EngineServer $PORT

