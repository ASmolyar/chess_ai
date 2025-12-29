#!/bin/bash

# Chess Engine Build Script
# Compiles the Java chess engine

set -e

cd "$(dirname "$0")"

echo "Building Chess Engine..."

# Check if Java compiler is available
if ! command -v javac &> /dev/null; then
    echo "Error: Java compiler (javac) not found!"
    echo ""
    echo "Please install Java Development Kit (JDK)"
    echo ""
    exit 1
fi

# Create output directory
mkdir -p out

# Compile
javac -d out src/chess/*.java

echo ""
echo "Build successful!"
echo "Output: out/chess/*.class"
echo ""
echo "To run the engine server:"
echo "  ./run-server.sh"
echo ""
