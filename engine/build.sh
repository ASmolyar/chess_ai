#!/bin/bash

# Chess Engine Build Script
# Compiles the Java chess engine

set -e

cd "$(dirname "$0")"

echo "Building Chess Engine..."

# Use Java 21 explicitly for consistency
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home")
export PATH="$JAVA_HOME/bin:$PATH"

# Check if Java compiler is available
if ! command -v javac &> /dev/null; then
    echo "Error: Java compiler (javac) not found!"
    echo ""
    echo "Please install Java Development Kit (JDK)"
    echo ""
    exit 1
fi

echo "Using Java: $(java -version 2>&1 | head -1)"

# Create output directory
mkdir -p out

# Find all Java source files (including rules subdirectories)
SOURCES=$(find src -name "*.java")

echo "Compiling $(echo "$SOURCES" | wc -l | tr -d ' ') Java files..."

# Compile all sources
javac -d out $SOURCES

echo ""
echo "Build successful!"
echo "Output: out/chess/*.class (and subpackages)"
echo ""
echo "To run the engine server:"
echo "  ./run-server.sh"
echo ""
