// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://multilingual-blog.ghufranhelmi.workers.dev',

  // Astro i18n — 9 languages
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh', 'es', 'ar', 'id', 'pt', 'fr', 'ja', 'ru'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },

  output: 'static',
});