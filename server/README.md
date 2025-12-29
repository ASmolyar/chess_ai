# Chess Eval Server

A backend server for storing and rating custom chess evaluation functions.

## Features

- **SQLite Database**: Stores eval configurations, ELO ratings, and match history
- **Public Leaderboard**: Anyone can upload and share their eval functions
- **ELO Calculation**: Automatically plays games against Stockfish at various skill levels to determine ELO
- **API Endpoints**: Full REST API for managing evals

## Requirements

- Node.js 18+
- Stockfish (for ELO calculation)
- The Java chess engine server running on port 8765

## Installation

```bash
# Install dependencies
npm install

# Install Stockfish (macOS)
brew install stockfish

# Install Stockfish (Ubuntu/Debian)
sudo apt install stockfish
```

## Usage

### Start the server

```bash
./run-server.sh
# or
npm start
```

The server runs on port 3001 by default.

### Start the Java engine (required for ELO calculation)

```bash
cd ../engine
./run-server.sh
```

## API Endpoints

### Evals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/evals` | List all public evals (leaderboard) |
| GET | `/api/evals/:id` | Get eval details |
| POST | `/api/evals` | Submit a new eval |
| PUT | `/api/evals/:id` | Update an eval |
| DELETE | `/api/evals/:id` | Delete an eval |
| POST | `/api/evals/:id/calculate-elo` | Trigger ELO calculation |
| GET | `/api/evals/:id/status` | Get ELO calculation status |
| GET | `/api/evals/:id/matches` | Get match history |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get leaderboard statistics |
| GET | `/health` | Health check |

## Eval Configuration Format

When uploading an eval, the `eval_config` should match the format from the Eval Builder:

```json
{
  "name": "My Eval",
  "description": "My custom evaluation function",
  "rules": [
    {
      "id": "rule_1",
      "name": "Pawns",
      "enabled": true,
      "category": "material",
      "condition": { "type": "always" },
      "target": { "type": "simple_material", "pieceType": "pawn" },
      "value": { "type": "fixed", "value": 100 }
    }
  ],
  "categoryWeights": {
    "material": 1.0,
    "mobility": 0.6,
    "king_safety": 1.0,
    "pawn_structure": 0.8,
    "positional": 0.7,
    "piece_coordination": 0.9,
    "threats": 1.0
  }
}
```

## ELO Calculation

When an eval is uploaded:

1. The server plays **40 games** against Stockfish (4 games at each of 10 skill levels)
2. Skill levels range from 0 (≈800 ELO) to 20 (≈2600 ELO)
3. All games are played at **depth 8** for consistency
4. ELO is calculated using standard Elo rating formulas
5. A confidence interval is estimated based on result consistency

## Database

The SQLite database (`evals.db`) stores:

- **evals**: Eval configurations, ratings, and stats
- **matches**: Individual match results and PGNs

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |

