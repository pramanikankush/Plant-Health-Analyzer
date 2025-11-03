# 🚀 Vercel Deployment Guide

## Quick Deploy

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variable**:
   - When prompted, add your `GOOGLE_API_KEY`
   - Or use: `vercel env add GOOGLE_API_KEY`

## What's Included

✅ **Working Features:**
- Plant disease analysis with AI
- Image upload (file/camera/batch)
- Treatment recommendations
- Medicine pricing
- Cost estimates

❌ **Disabled Features:**
- User authentication
- Analysis history storage
- Reminders system
- PDF export
- Progress tracking

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | ✅ | Your Google Gemini API key |

## File Structure

```
api/
├── index.py          # Main serverless function
templates/
├── index.html        # Main page
├── components/
    ├── navbar_simple.html  # Simplified navbar
    └── theme_script.html   # Theme toggle
static/
├── app.js           # Frontend logic
└── style.css        # Styles
```

## Troubleshooting

**500 Error**: Check Vercel function logs
**API Key Error**: Verify GOOGLE_API_KEY is set
**Template Error**: Ensure all template files exist

## Demo Mode

This version runs in demo mode with storage features disabled to work on Vercel's serverless platform. Users can analyze plants but cannot save history or create accounts.