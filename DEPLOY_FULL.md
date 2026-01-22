# Deploy Full-Featured Chess AI Arena

This guide explains how to deploy **all features** including engine bots and ELO calculation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                   (Vercel - Static + API)                       │
│              https://chessai-three.vercel.app                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                            │
├─────────────────────────────┬───────────────────────────────────┤
│     Java Engine Server      │      Eval Server + Stockfish      │
│     (Railway/Render)        │         (Railway/Render)          │
│     Port 8765               │         Port 3001 + 3002          │
│                             │                                    │
│  - Search/evaluation        │  - ELO calculation                │
│  - Engine bots              │  - Match running                  │
│  - Custom eval execution    │  - WebSocket broadcasts           │
└─────────────────────────────┴───────────────────────────────────┘
```

## Option 1: Deploy to Railway (Recommended)

Railway offers a generous free tier and easy Docker deployments.

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Deploy the Eval Server (with Stockfish)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy the server
railway up --dockerfile Dockerfile.server
```

Or via Dashboard:
1. Go to [railway.app/new](https://railway.app/new)
2. Choose "Deploy from GitHub repo"
3. Select your chess_ai repository
4. Set **Dockerfile path** to `Dockerfile.server`
5. Add environment variable: `PORT=3001`
6. Deploy!

### Step 3: Deploy the Java Engine

Create a second Railway service:

```bash
# In the same project, add a new service
railway service create engine

# Deploy
railway up --dockerfile Dockerfile.engine --service engine
```

Or via Dashboard:
1. In your Railway project, click "New Service"
2. Choose "Docker"
3. Set **Dockerfile path** to `Dockerfile.engine`
4. Deploy!

### Step 4: Update Frontend Config

Once deployed, you'll get URLs like:
- `https://chess-eval-server-production.up.railway.app`
- `https://chess-engine-production.up.railway.app`

Add a config script to your `index.html` before other scripts:

```html
<script>
  window.ENV_CONFIG = {
    ENGINE_URL: 'https://your-engine.up.railway.app',
    EVAL_SERVER_URL: 'https://your-server.up.railway.app',
    WS_URL: 'wss://your-server.up.railway.app'
  };
</script>
<script src="js/config.js"></script>
```

### Step 5: Redeploy Vercel

```bash
vercel --prod
```

## Option 2: Deploy to Render

Render also offers free tier with Docker support.

### render.yaml

Create `render.yaml` in your project root:

```yaml
services:
  - type: web
    name: chess-engine
    env: docker
    dockerfilePath: ./Dockerfile.engine
    plan: free
    
  - type: web
    name: chess-eval-server
    env: docker
    dockerfilePath: ./Dockerfile.server
    plan: free
    envVars:
      - key: PORT
        value: 3001
```

Then:
1. Go to [render.com](https://render.com)
2. Connect your GitHub repo
3. Render will auto-detect `render.yaml`

## Option 3: Deploy to Fly.io

Fly.io offers great performance with a free tier.

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy engine
fly launch --dockerfile Dockerfile.engine --name chess-engine

# Deploy eval server
fly launch --dockerfile Dockerfile.server --name chess-eval-server
```

## Environment Variables

### Eval Server (Dockerfile.server)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | 3001 |
| `WS_PORT` | WebSocket port | 3002 |
| `DATABASE_URL` | Postgres connection string | (from Neon) |

### Engine Server (Dockerfile.engine)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8765 |

## Costs

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Railway | 500 hours/month | Enough for moderate usage |
| Render | 750 hours/month | Spins down after inactivity |
| Fly.io | 3 VMs free | Good performance |
| Vercel | Unlimited static | Already deployed |

## Verification

After deployment, test your services:

```bash
# Test engine
curl https://your-engine.up.railway.app/health

# Test eval server
curl https://your-server.up.railway.app/health

# Test frontend
curl https://chessai-three.vercel.app/api/health
```

## Troubleshooting

### Engine bots not working

1. Check that `ENGINE_URL` is set correctly in `window.ENV_CONFIG`
2. Verify the engine server is running: `curl $ENGINE_URL/health`
3. Check browser console for CORS errors

### ELO calculation not running

1. Stockfish must be installed in the container
2. Check Railway/Render logs for errors
3. Verify database connection

### WebSocket connection failed

1. Use `wss://` (secure) in production
2. Some hosts require specific WebSocket configuration
3. Check if the WS port is exposed
