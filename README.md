# ScootNav - Navigation für Roller & Scooter

A modern navigation app for scooters and motorcycles with route planning, POI discovery, and real-time GPS tracking.

## Features

- 🗺️ Interactive map with Leaflet
- 📍 Real-time GPS location tracking
- 🔋 Vehicle profile management (electric/petrol)
- ⚡ POI discovery (charging stations, fuel, restaurants, etc.)
- 🧭 Turn-by-turn navigation
- ❤️ Favorite locations
- 🎨 Beautiful glassmorphism UI

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deploy to GitHub Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. Commit and push the `docs` folder:
   ```bash
   git add docs
   git commit -m "Deploy to GitHub Pages"
   git push
   ```

3. In your GitHub repository settings:
   - Go to **Settings** → **Pages**
   - Under **Source**, select **Deploy from a branch**
   - Choose **main** branch and **/docs** folder
   - Click **Save**

4. Your site will be available at: `https://yourusername.github.io/ScootNav/`

## Project Structure

```
ScootNav/
├── docs/              # Built files (for GitHub Pages)
├── src/
│   ├── components/    # React components
│   ├── utils/         # Helper functions and API calls
│   ├── App.jsx        # Main app component
│   ├── main.jsx       # Entry point
│   ├── config.js      # Configuration
│   └── styles.css     # Custom styles
├── index.html         # HTML template
├── package.json       # Dependencies
└── vite.config.js     # Vite configuration
```

## Technologies

- React 18
- Vite
- Leaflet (maps)
- Lucide React (icons)
- Tailwind CSS (via CDN)

