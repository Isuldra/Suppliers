# Cloudflare Pages Setup Guide

## Overview

Cloudflare Pages provides free, fast, and reliable hosting for your update files. It's better than GitHub Pages because:

- ✅ Faster global CDN
- ✅ Better reliability
- ✅ Custom domains
- ✅ No GitHub dependencies
- ✅ Better for corporate environments

## Step-by-Step Setup

### 1. Connect GitHub Repository

1. **Go to Cloudflare Dashboard**

   - Navigate to: https://dash.cloudflare.com/
   - Click "Pages" in the left sidebar

2. **Create New Project**

   - Click "Create a project"
   - Select "Connect to Git"

3. **Connect GitHub**
   - Click "Connect to Git"
   - Choose "GitHub" as your Git provider
   - Authorize Cloudflare to access your repositories
   - Select your `Isuldra/Suppliers` repository

### 2. Configure Build Settings

**Framework preset**: None (Static Site)

**Build command**:

```bash
npm run deploy:cloudflare
```

**Build output directory**:

```
docs/updates
```

**Root directory**:

```
/
```

### 3. Environment Variables (Optional)

No environment variables needed for static files.

### 4. Custom Domain (Optional - Not Required!)

**You don't need your own domain!** Cloudflare Pages gives you a free subdomain automatically.

**Default URL**: `https://suppliers.pages.dev/` (or similar)

**If you want a custom domain later:**

- Go to "Custom domains" tab
- Add your domain (e.g., `updates.onemed.no`)
- Follow DNS setup instructions

## Update Build Script

Add this to your `package.json`:

```json
{
  "scripts": {
    "deploy:cloudflare": "node scripts/deploy-to-cloudflare.js"
  }
}
```

## Benefits of Cloudflare Pages

1. **Global CDN**: Files served from nearest location
2. **Better Performance**: Faster than GitHub Pages
3. **Custom Domain**: Use your own domain
4. **No Rate Limits**: Unlike GitHub API
5. **Corporate Friendly**: Works behind firewalls
6. **Free Tier**: Generous free limits

## Deployment Process

1. **Push to GitHub**: Your changes trigger automatic deployment
2. **Cloudflare Builds**: Automatically builds and deploys
3. **Global CDN**: Files available worldwide instantly
4. **Auto-Updates**: Your app checks the Cloudflare URL

## URLs After Setup

- **Update URL**: `https://suppliers.pages.dev/` (or your custom domain)
- **Latest JSON**: `https://suppliers.pages.dev/latest.json`
- **App Update**: `https://suppliers.pages.dev/app-update.json`
- **Manual Downloads**: `https://suppliers.pages.dev/index.html`
