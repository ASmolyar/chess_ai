#!/bin/bash
# Chess AI Arena - Vercel Deployment Script
# Run this script to deploy to Vercel with database setup

set -e

echo "🚀 Chess AI Arena - Vercel Deployment"
echo "======================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check login status
echo "🔐 Checking Vercel login status..."
if ! vercel whoami &> /dev/null; then
    echo "Please log in to Vercel:"
    vercel login
fi

VERCEL_USER=$(vercel whoami)
echo "✅ Logged in as: $VERCEL_USER"
echo ""

# Deploy the project
echo "📤 Deploying project to Vercel..."
echo ""

# First deployment (creates the project)
vercel --yes

echo ""
echo "✅ Initial deployment complete!"
echo ""

# Get the project name
PROJECT_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*"name": "\(.*\)".*/\1/')
echo "📊 Project: $PROJECT_NAME"
echo ""

# Create Postgres database
echo "🗄️  Setting up Postgres database..."
echo ""

# Link the project first
vercel link --yes 2>/dev/null || true

# Create Postgres storage
echo "Creating Vercel Postgres database..."
vercel storage create postgres chess-ai-db --yes 2>/dev/null || {
    echo "Note: Database may already exist or needs manual setup."
    echo "If this failed, go to: https://vercel.com/dashboard → Your Project → Storage"
}

echo ""
echo "🔄 Pulling environment variables..."
vercel env pull .env.local --yes 2>/dev/null || true

# Redeploy with database connection
echo ""
echo "🚀 Redeploying with database connection..."
vercel --prod --yes

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "Your site is now live!"
echo ""
echo "Next steps:"
echo "1. Visit your Vercel dashboard to verify the deployment"
echo "2. Check Storage tab to confirm database is connected"
echo "3. Test the API: https://YOUR-PROJECT.vercel.app/api/health"
echo ""
echo "For full features (ELO calculation, engine bots), run locally:"
echo "  npm run dev"
echo ""
