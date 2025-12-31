# Personal Website

A minimalist, terminal-themed personal website built with Astro.

## Features

- 🌑 Dark terminal aesthetic with monospace fonts
- ⚡ Lightning fast with Astro
- 📝 Blog-ready with markdown support
- 📱 Fully responsive
- ♿ Accessible
- 🎨 Customizable accent colors

## Tech Stack

- **Framework:** Astro 4.x
- **Styling:** Pure CSS (no frameworks needed)
- **Font:** JetBrains Mono
- **Deployment:** Vercel/Netlify ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The site will be available at `http://localhost:4321`

## Project Structure

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro          # Base layout with styling
│   ├── pages/
│   │   ├── index.astro           # Homepage
│   │   ├── about.astro           # About page
│   │   ├── blog.astro            # Blog listing
│   │   └── blog/
│   │       └── building-vispyr.astro  # Sample blog post
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Customization

### Colors

Edit the CSS variables in `src/layouts/Layout.astro`:

```css
:root {
  --bg: #0a0a0a;           /* Background */
  --text: #e0e0e0;         /* Main text */
  --text-dim: #a0a0a0;     /* Dimmed text */
  --accent: #00ff9f;       /* Accent color */
  --accent-dim: #00cc7f;   /* Dimmed accent */
  --border: #333;          /* Borders */
}
```

### Content

1. Update personal info in `src/pages/index.astro`
2. Update links (GitHub, LinkedIn, email) throughout the pages
3. Add your projects to the homepage
4. Create new blog posts in `src/pages/blog/`

### Font

The site uses JetBrains Mono by default. To change it:

1. Update the `@import` in `src/layouts/Layout.astro`
2. Update the `font-family` in the CSS

Other great monospace options:
- Fira Code
- IBM Plex Mono
- Source Code Pro
- Inconsolata

## Adding Blog Posts

Create a new `.astro` file in `src/pages/blog/`:

```astro
---
import Layout from '../../layouts/Layout.astro';
---

<Layout title="Your Post Title">
  <article class="blog-post">
    <header class="post-header">
      <time>January 1, 2025</time>
      <h1>Your Post Title</h1>
    </header>
    <div class="post-content">
      <!-- Your content here -->
    </div>
  </article>
</Layout>
```

Then add it to the posts array in `src/pages/blog.astro`.

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### GitHub Pages

Update `astro.config.mjs`:

```js
export default defineConfig({
  site: 'https://yourusername.github.io',
  base: '/your-repo-name',
});
```

Then:

```bash
npm run build
# Deploy the dist/ folder
```

## SEO

Update the following in your pages:
- `title` prop in `<Layout>`
- `description` prop in `<Layout>`
- `site` in `astro.config.mjs`

## License

MIT - Feel free to use this as a template for your own site!
