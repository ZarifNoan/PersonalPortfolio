import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://zarifnurhan.vercel.app', // updated in Task 11 once the real Vercel URL exists
  integrations: [react(), sitemap()],
});
