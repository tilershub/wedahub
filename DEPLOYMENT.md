# Deployment Guide

This guide covers deploying your TradeWorker Directory to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:
- ✅ Supabase database set up and configured
- ✅ Environment variables ready (`PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`)
- ✅ Code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Options

### 1. Netlify (Recommended)

#### Quick Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select your repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - Add environment variables:
     - `PUBLIC_SUPABASE_URL`
     - `PUBLIC_SUPABASE_ANON_KEY`
   - Click "Deploy site"

#### Netlify CLI Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

### 2. Vercel

#### Via Vercel Dashboard

1. **Push to GitHub** (same as above)

2. **Import to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Vercel auto-detects Astro settings
   - Add environment variables:
     - `PUBLIC_SUPABASE_URL`
     - `PUBLIC_SUPABASE_ANON_KEY`
   - Click "Deploy"

#### Vercel CLI Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel

# Production deployment
vercel --prod
```

### 3. Cloudflare Pages

1. **Push to GitHub** (same as above)

2. **Create Cloudflare Pages Project**
   - Go to [Cloudflare Pages](https://pages.cloudflare.com)
   - Click "Create a project"
   - Connect your Git provider and select repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - Add environment variables:
     - `PUBLIC_SUPABASE_URL`
     - `PUBLIC_SUPABASE_ANON_KEY`
   - Click "Save and Deploy"

#### Wrangler CLI (Cloudflare)

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
npm run build
wrangler pages deploy dist
```

### 4. AWS Amplify

1. **Push to GitHub** (same as above)

2. **Deploy via AWS Amplify Console**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect your Git provider
   - Configure build settings:
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - npm install
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: dist
         files:
           - '**/*'
     ```
   - Add environment variables in "Environment variables" section
   - Click "Save and deploy"

### 5. GitHub Pages

**Note**: GitHub Pages requires a custom workflow since Astro builds to `dist/`.

1. **Create `.github/workflows/deploy.yml`**:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
         
         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: '18'
         
         - name: Install dependencies
           run: npm install
         
         - name: Build
           env:
             PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
             PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
           run: npm run build
         
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v2
           with:
             path: ./dist

     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v2
   ```

2. **Configure GitHub Repository**:
   - Go to Settings → Pages
   - Source: GitHub Actions
   - Add secrets in Settings → Secrets and variables → Actions

3. **Update `astro.config.mjs`** to set the site URL:
   ```js
   export default defineConfig({
     site: 'https://yourusername.github.io',
     base: '/your-repo-name',
     // ... rest of config
   });
   ```

## Post-Deployment Checklist

After deploying, verify:

- ✅ Home page loads correctly
- ✅ Trade directory pages work (tilers, plumbers, electricians)
- ✅ Worker profiles display properly
- ✅ WhatsApp buttons function correctly
- ✅ Lead tracking works
- ✅ Database connection is successful
- ✅ Images and assets load
- ✅ Mobile responsiveness
- ✅ Navigation works across all pages

## Custom Domain Setup

### Netlify
1. Go to Site settings → Domain management
2. Add custom domain
3. Follow DNS configuration instructions

### Vercel
1. Go to Project settings → Domains
2. Add domain and configure DNS

### Cloudflare Pages
1. Go to Custom domains
2. Add domain
3. Update DNS in Cloudflare Dashboard

## Environment Variables

Make sure these are set in your deployment platform:

| Variable | Description | Required |
|----------|-------------|----------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Troubleshooting

### Build Fails

**Issue**: Build command fails
- Check Node.js version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

### Environment Variables Not Working

**Issue**: Supabase connection fails
- Verify environment variables are set correctly
- Variables must start with `PUBLIC_` to be accessible in browser
- Redeploy after adding environment variables

### 404 on Routes

**Issue**: Dynamic routes return 404
- Ensure build output is set to `dist`
- For Netlify, add `_redirects` file in `public/`:
  ```
  /*    /index.html   200
  ```

### WhatsApp Button Not Working

**Issue**: WhatsApp integration fails
- Check phone number format
- Verify lead tracking function
- Check browser console for errors

## Performance Optimization

After deployment:

1. **Enable CDN caching** (most platforms do this automatically)
2. **Configure image optimization**
3. **Enable gzip/brotli compression**
4. **Set up analytics** (Google Analytics, Plausible, etc.)
5. **Monitor performance** with Lighthouse

## Continuous Deployment

All platforms support automatic deployments:
- Push to `main` branch triggers automatic deployment
- Pull requests create preview deployments
- Rollback to previous deployments if needed

## Monitoring

Set up monitoring for:
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Analytics (Google Analytics, Plausible)
- Database monitoring in Supabase dashboard

## Support

If you encounter issues:
1. Check platform-specific documentation
2. Review build logs
3. Test locally first: `npm run build && npm run preview`
4. Open an issue on GitHub

---

Happy deploying! 🚀
