# Deployment Guide

## Quick Deploy to Vercel (Recommended)

Vercel has first-class support for Astro and offers:
- Automatic deployments from Git
- Custom domains
- SSL certificates
- Edge network (fast globally)
- Free tier for personal projects

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel auto-detects Astro - just click "Deploy"
6. Your site is live! 🎉

### Option 2: Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (run from project root)
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? (accept default or customize)
# - Directory? ./
# - Override settings? N

# Your site is live!
```

### Custom Domain

1. Go to your project in Vercel dashboard
2. Settings → Domains
3. Add your domain (e.g., joecardoso.com)
4. Update DNS records as instructed
5. SSL certificate is automatic

## Alternative: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod

# Follow prompts and your site is live
```

## Alternative: GitHub Pages

For free hosting on GitHub:

1. Update `astro.config.mjs`:
```js
export default defineConfig({
  site: 'https://yourusername.github.io',
  base: '/repo-name', // Only if using a project page
});
```

2. Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

3. Enable GitHub Pages in repo settings (use `gh-pages` branch)

## SEO Checklist Before Deploy

- [ ] Update `site` in `astro.config.mjs` to your actual domain
- [ ] Update all placeholder links (GitHub, LinkedIn, email)
- [ ] Add Google Analytics (if desired)
- [ ] Create a sitemap (Astro can do this automatically)
- [ ] Test on mobile devices

## Post-Deployment

1. Test the site thoroughly
2. Run Lighthouse audit in Chrome DevTools
3. Submit sitemap to Google Search Console
4. Share on social media!

## Updating Content

With Vercel/Netlify:
1. Push changes to GitHub
2. Automatic deployment triggers
3. Site updates in ~1 minute

That's it! Your site is production-ready.
