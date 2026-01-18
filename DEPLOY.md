# GitHub Pages Deployment Guide

## Quick Deploy Steps

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Commit the docs folder:**
   ```bash
   git add docs
   git commit -m "Deploy to GitHub Pages"
   git push
   ```

3. **Configure GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **Deploy from a branch**
   - Choose **main** (or **master**) branch
   - Select **/docs** folder
   - Click **Save**

4. **Wait a few minutes** for GitHub to deploy your site

5. **Your site will be live at:**
   `https://YOUR_USERNAME.github.io/ScootNav/`

## Automatic Deployment (Optional)

To automatically deploy on every push, you can use GitHub Actions. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## Troubleshooting

- **404 Error:** Make sure the base path in `vite.config.js` is set to `'./'`
- **Blank Page:** Check browser console for errors
- **Assets Not Loading:** Verify all files in `docs` folder are committed

