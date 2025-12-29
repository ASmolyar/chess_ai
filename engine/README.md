# Chess Engine

A high-performance chess engine written in Java with HTTP server interface for browser use.

## Features

- **Bitboards**: 64-bit integer board representation for fast move generation
- **Magic Bitboards**: Pre-computed attack tables for sliding pieces (bishops, rooks, queens)
- **Zobrist Hashing**: Efficient position hashing for transposition table
- **Transposition Table**: Hash table to cache evaluated positions
- **Iterative Deepening**: Progressively deeper searches with time management
- **Alpha-Beta Pruning**: Eliminates branches that can't affect the result
- **Quiescence Search**: Extends search for captures to avoid horizon effect
- **Move Ordering**: TT move, MVV-LVA for captures, killer moves, history heuristic
- **Null Move Pruning**: Skip moves to prove position strength
- **Late Move Reductions**: Search less promising moves at reduced depth

## Building

### Prerequisites

- Java Development Kit (JDK) 11 or later

### Compile

```bash
cd engine
./build.sh
```

This creates compiled class files in `out/chess/`.

## Running the Server

```bash
cd engine
./run-server.sh
```

The server starts on port 8765 by default. You can specify a different port:

```bash
./run-server.sh 9000
```

## Architecture

```
engine/
├── src/chess/
│   ├── Types.java           # Basic types, enums, Move class
│   ├── Bitboard.java        # Bitboard operations, attack tables
│   ├── Position.java        # Board representation, make/unmake move
│   ├── MoveGen.java         # Legal move generation
│   ├── TranspositionTable.java  # Transposition table
│   ├── Eval.java            # Evaluation function
│   ├── Search.java          # Iterative deepening, alpha-beta, quiescence
│   ├── Engine.java          # Main engine class
│   └── EngineServer.java    # HTTP server interface
├── out/                     # Compiled class files
├── build.sh
├── run-server.sh
└── README.md
```

## HTTP API

The engine exposes a REST API:

### Health Check
```
GET /health
```

### Initialize Engine
```
POST /api/init
```

### Set Position (FEN)
```
POST /api/setFen
Content-Type: application/json
{ "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" }
```

### Search for Best Move
```
POST /api/search
Content-Type: application/json
{ "depth": 10, "time": 0 }
```

Returns:
```json
{ "bestMove": "e2e4" }
```

### Get Search Info
```
GET /api/getInfo
```

Returns:
```json
{ "depth": 10, "score": 35, "nodes": 1234567, "time": 1500 }
```

## Performance

Expected search depths at various time limits (approximate):

| Time | Typical Depth |
|------|--------------|
| 100ms | 6-8 |
| 1s | 10-12 |
| 5s | 14-16 |
| 30s | 18-20 |

The transposition table and pruning techniques allow the engine to search much deeper than a naive minimax implementation.
