import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourdomain.com', // Update this with your domain
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
