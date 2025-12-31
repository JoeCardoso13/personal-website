# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimalist, terminal-themed personal website built with Astro. Features a dark monospace aesthetic inspired by command-line interfaces, with ASCII art, shell-style section headers (e.g., `$ ls projects/`), and green accent colors reminiscent of classic terminals.

## Development Commands

```bash
# Start development server (http://localhost:4321)
npm run dev
# or
npm start

# Build for production (includes type checking)
npm run build

# Preview production build locally
npm run preview

# Type check only
npx astro check
```

## Architecture

### Core Structure

- **Single Layout Pattern**: All pages use `src/layouts/Layout.astro` as the base layout
  - Contains global CSS variables, navigation, footer, and all base styles
  - Props: `title` (required), `description` (optional, defaults to "Joe Cardoso - Software Engineer")
  - Navigation automatically renders on every page with logo (`~/joe`) and links to home, blog, about

- **Pages Directory**: Simple file-based routing via `src/pages/`
  - Each `.astro` file in `src/pages/` becomes a route automatically
  - Blog posts are individual `.astro` files in `src/pages/blog/`
  - The `blog.astro` index manually lists posts in a frontmatter array (not using content collections)

### Styling Approach

- **Global CSS**: All base styles defined in `Layout.astro` using `<style is:global>`
- **Component Scoping**: Page-specific styles use regular `<style>` blocks in each `.astro` file
- **No CSS Framework**: Pure CSS with CSS variables for theming
- **Terminal Theme Variables** (defined in Layout.astro):
  ```css
  --bg: #0a0a0a           /* Background */
  --text: #e0e0e0         /* Main text */
  --text-dim: #a0a0a0     /* Dimmed text */
  --accent: #00ff9f       /* Accent (terminal green) */
  --accent-dim: #00cc7f   /* Dimmed accent */
  --border: #333          /* Borders */
  ```

### Content Management

- **Blog Posts**: Written in Markdown, dynamically fetched via `import.meta.glob()`
  - Posts are `.md` files in `src/pages/blog/` using the `BlogPost.astro` layout
  - `blog.astro` automatically discovers all posts—no manual array to maintain
  - Posts are sorted by date (newest first)
  - To add a new post:
    1. Create `.md` file in `src/pages/blog/` with frontmatter (layout, title, date, description)
    2. Write content in Markdown
    3. Done! The post will automatically appear in the blog listing

- **Personal Content**: Hardcoded in pages
  - Projects listed directly in `index.astro`
  - Links (GitHub, LinkedIn, email) appear in multiple files as placeholder URLs
  - Update these throughout: `index.astro`, blog posts, etc.

### Configuration

- **astro.config.mjs**: Minimal config with:
  - `site`: Domain for SEO/sitemap (currently placeholder "https://yourdomain.com")
  - `markdown.shikiConfig.theme`: "github-dark" for code syntax highlighting

- **TypeScript**: Uses Astro's strict preset with React JSX config (though no React components currently in use)

## Key Patterns

### Terminal Aesthetic
- Section headers styled as shell commands: `$ ls projects/`, `$ cat blog/*`, `$ echo $CONTACT`
- ASCII art in hero section of homepage
- Monospace font (JetBrains Mono) throughout
- Code blocks and inline code styled with terminal-like appearance

### Responsive Design
- Max-width: 800px container, centered
- Mobile breakpoint: 640px
  - Navigation switches to column layout
  - Hero text size reduces
  - Contact links stack vertically

### Project Cards
- Border-box design with hover effects (border color changes to accent)
- Tech stack tags displayed as pill-shaped badges
- Consistent spacing and typography

## Common Tasks

### Adding a Blog Post
1. Create `src/pages/blog/your-post-slug.md` with frontmatter:
   ```markdown
   ---
   layout: ../../layouts/BlogPost.astro
   title: "Your Post Title"
   date: "Month Day, Year"
   description: "Brief description for SEO and previews"
   ---

   ## Your First Heading

   Your content here in Markdown...
   ```
2. Write content using standard Markdown syntax
3. Done! The post is automatically discovered and listed

### Changing Theme Colors
Edit CSS variables in `src/layouts/Layout.astro` (lines 51-58)

### Updating Personal Info
- Name/tagline: `src/pages/index.astro`
- Projects: Hardcoded in `index.astro` project cards
- Contact links: `index.astro`, update GitHub/LinkedIn/email URLs
- Footer copyright: `src/layouts/Layout.astro`

## Deployment

Site is configured for deployment to Vercel, Netlify, or GitHub Pages. See DEPLOYMENT.md for detailed instructions. Before deploying, update:
- `site` in `astro.config.mjs` to actual domain
- All placeholder links (GitHub, LinkedIn, email, Medium)
