@echo off
echo 🌱 Plant Health Analyzer - Vercel Deployment
echo =============================================

where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Please install it first:
    echo npm install -g vercel
    pause
    exit /b 1
)

echo 🔧 Setting up environment variables...
vercel env add GOOGLE_API_KEY

echo 🚀 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 📝 Note: This is a demo version with storage features disabled
echo 🔗 Your app should be available at the provided URL
pause