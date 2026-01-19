# 🚀 Deployment Guide

This guide explains how to deploy the Scrum Poker application using **Fly.io** for the backend and **Cloudflare Pages** for the frontend.

## 🔧 Prerequisites

1. **Git repository** - Push your code to GitHub/GitLab
2. **Fly.io account** - Sign up at [fly.io](https://fly.io)
3. **Cloudflare account** - Sign up at [cloudflare.com](https://cloudflare.com)
4. **Fly CLI** - Install from [fly.io/docs/hands-on/install-flyctl](https://fly.io/docs/hands-on/install-flyctl)

## 🎯 Part 1: Deploy Backend to Fly.io

### Step 1: Install and authenticate Fly CLI
```bash
# Install Fly CLI (macOS)
brew install flyctl

# Or download from https://fly.io/docs/hands-on/install-flyctl/

# Authenticate
fly auth login
```

### Step 2: Deploy the backend
```bash
cd backend

# Create and deploy app
fly launch --no-deploy

# When prompted:
# - App Name: scrum-poker-backend (or your preferred name)
# - Region: Choose closest to your users (e.g., fra for Europe)
# - Postgres: No
# - Redis: No

# Deploy
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

### Step 3: Get your backend URL
```bash
fly status
# Your app will be available at: https://scrum-poker-backend.fly.dev
```

## ☁️ Part 2: Deploy Frontend to Cloudflare Pages

### Step 1: Update environment variables
1. Edit `frontend/.env.production`
2. Replace `scrum-poker-backend.fly.dev` with your actual Fly.io app URL:

```env
VITE_API_BASE_URL=https://your-app-name.fly.dev
VITE_WS_BASE_URL=wss://your-app-name.fly.dev
```

### Step 2: Deploy to Cloudflare Pages

#### Option A: Via Cloudflare Dashboard (Recommended)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **Create a project**
3. Choose **Connect to Git**
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
6. Add environment variables:
   - `VITE_API_BASE_URL`: `https://your-app-name.fly.dev`
   - `VITE_WS_BASE_URL`: `wss://your-app-name.fly.dev`
7. Click **Save and Deploy**

#### Option B: Via Wrangler CLI
```bash
cd frontend

# Install Wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Create Pages project
wrangler pages project create scrum-poker

# Build and deploy
npm run build
wrangler pages deploy dist --project-name=scrum-poker
```

## 🔐 Part 3: Security Configuration (Optional)

For production security, update CORS origins in your Fly.io app:

```bash
fly secrets set ALLOWED_ORIGINS="https://scrum-poker.pages.dev"
```

## ✅ Part 4: Verification

1. **Backend health check**: Visit `https://your-app-name.fly.dev/api/health`
2. **Frontend**: Visit your Cloudflare Pages URL
3. **WebSocket**: Test creating and joining rooms

## 🔄 Continuous Deployment

### Auto-deploy backend (Fly.io)
```bash
cd backend

# Setup GitHub Actions deployment (optional)
fly deploy --config fly.toml
```

### Auto-deploy frontend (Cloudflare Pages)
Cloudflare Pages automatically redeploys when you push to your Git repository.

## 📊 Monitoring & Logs

### Fly.io Backend
```bash
# View logs
fly logs

# Monitor metrics
fly dashboard

# Check app status
fly status
```

### Cloudflare Pages
- View deployments in Cloudflare Dashboard → Pages
- Monitor analytics in Cloudflare Dashboard → Analytics

## 💰 Cost Estimation

### Fly.io (Backend)
- **Free tier**: 3 shared-cpu VMs with 256MB RAM
- **Paid**: ~$1.94/month for 256MB shared CPU

### Cloudflare Pages (Frontend)
- **Free tier**: 100,000 requests/month, unlimited static requests
- **Paid**: $20/month for 10M requests

## 🐛 Troubleshooting

### Backend Issues
```bash
# Check logs
fly logs

# SSH into the app
fly ssh console

# Check health
curl https://your-app-name.fly.dev/api/health
```

### Frontend Issues
1. Check Cloudflare Pages deployment logs
2. Verify environment variables are set correctly
3. Check browser console for CORS errors

### CORS Issues
- Ensure backend CORS is configured for your Cloudflare Pages domain
- Set `ALLOWED_ORIGINS` secret in Fly.io if needed

## 🎯 Custom Domains (Optional)

### Fly.io Custom Domain
```bash
fly certs create your-api-domain.com
```

### Cloudflare Pages Custom Domain
1. Cloudflare Dashboard → Pages → Your project → Custom domains
2. Add your domain and follow DNS instructions

---

Your Scrum Poker application is now deployed and ready for use! 🎉

**Backend**: https://your-app-name.fly.dev
**Frontend**: https://scrum-poker.pages.dev (or your custom domain)