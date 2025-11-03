# 🚀 GitHub + Vercel Deployment

## 1. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/plant-health-analyzer.git
git push -u origin main
```

## 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variable:
   - `GOOGLE_API_KEY` = `your_api_key`
5. Click "Deploy"

## 3. Quick Commands

```bash
# Push changes
git add .
git commit -m "Update"
git push

# Vercel will auto-deploy on push
```

Done! Your app will be live at `https://your-project.vercel.app`