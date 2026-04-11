import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourdomain.com', // Update this with your domain
  integrations: [svelte()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
