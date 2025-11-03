#!/bin/bash

echo "🌱 Plant Health Analyzer - Vercel Deployment"
echo "============================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Set environment variables
echo "🔧 Setting up environment variables..."
vercel env add GOOGLE_API_KEY

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📝 Note: This is a demo version with storage features disabled"
echo "🔗 Your app should be available at the provided URL"