# Deploying Chess AI Arena to Vercel

This guide walks you through deploying Chess AI Arena to Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- [Vercel CLI](https://vercel.com/cli) installed (optional, for CLI deployment)
- Node.js 18+ installed locally

## Quick Deploy

### 1. One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/chess_ai)

Or manually:

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel will auto-detect the configuration

### 2. Set Up Database

The app uses Vercel Postgres for storing evaluations:

1. In your Vercel project dashboard, go to **Storage**
2. Click **Connect Database** → **Create New** → **Postgres**
3. Follow the prompts to create a Postgres database
4. The environment variables will be automatically added to your project

### 3. Deploy

Click **Deploy** and wait for the build to complete.

## Environment Variables

The following environment variables are automatically set when you connect Vercel Postgres:

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Connection string for pooled connections |
| `POSTGRES_PRISMA_URL` | Connection string for Prisma |
| `POSTGRES_URL_NON_POOLING` | Connection string for non-pooled connections |
| `POSTGRES_USER` | Database username |
| `POSTGRES_HOST` | Database host |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DATABASE` | Database name |

## Features in Production vs Local

| Feature | Production (Vercel) | Local Development |
|---------|---------------------|-------------------|
| Leaderboard | ✅ Full | ✅ Full |
| Submit Evals | ✅ Full | ✅ Full |
| View Evals | ✅ Full | ✅ Full |
| ELO Calculation | ❌ Not available* | ✅ Full (requires Stockfish) |
| Play vs Engine Bots | ❌ Not available* | ✅ Full (requires Java engine) |
| Play vs Random Bot | ✅ Full | ✅ Full |
| Eval Builder | ✅ Full | ✅ Full |
| Live Game Viewer | ❌ Not available* | ✅ Full |

*These features require persistent processes (Stockfish, Java engine) that can't run in serverless environments.

## Local Development

For full functionality including ELO calculation and playing against engine bots:

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start the eval server (for leaderboard API)
cd server && npm run dev

# In another terminal, start the Java engine (for playing against bots)
cd engine && ./run-server.sh

# Open index.html in your browser
```

### Prerequisites for Local Development

- **Node.js 18+**
- **Java 21+** (for the chess engine)
- **Stockfish** (for ELO calculation): `brew install stockfish`

## Project Structure

```
chess_ai/
├── api/                    # Vercel serverless functions
│   ├── evals/              # Eval CRUD endpoints
│   ├── health.js           # Health check
│   └── stats.js            # Statistics endpoint
├── lib/                    # Shared libraries
│   └── db.js               # Database operations
├── public/                 # Static files (built)
├── js/                     # Frontend JavaScript
├── server/                 # Local Express server (not used in Vercel)
├── engine/                 # Java chess engine
├── index.html              # Main HTML file
├── style.css               # Styles
├── vercel.json             # Vercel configuration
└── package.json            # Root package.json
```

## Troubleshooting

### Database Connection Error

If you see database connection errors:
1. Make sure you've connected a Postgres database in Vercel Storage
2. Check that environment variables are properly set
3. Redeploy the project after connecting the database

### API Endpoints Not Working

1. Check the Vercel function logs in the dashboard
2. Make sure the `api/` folder structure is correct
3. Verify `vercel.json` rewrites are configured properly

### Missing Features

Some features require local deployment:
- **ELO Calculation**: Requires Stockfish (install locally)
- **Engine Bots**: Requires the Java engine server (run locally)

## Architecture Notes

### Serverless Limitations

Vercel serverless functions have limitations that prevent some features:

1. **No persistent processes**: Stockfish needs to run continuously for ELO calculation
2. **No WebSocket support**: Live game broadcasting requires persistent connections
3. **No Java runtime**: The chess engine is written in Java

### Alternative Deployment for Full Features

For full functionality, consider:

1. **Hybrid deployment**: 
   - Deploy frontend + API to Vercel
   - Deploy engine server to Railway/Fly.io/Render

2. **Full server deployment**:
   - Deploy everything to a VPS or container platform
   - Use Docker for consistent environments

## Support

For issues or questions, open an issue on GitHub.
