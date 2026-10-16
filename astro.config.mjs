// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://plugandnest.com',

  // Astro i18n — 20 languages
  i18n: {
    defaultLocale: 'en',
    locales: [
      // 12 Bahasa Lama
      'en', 'zh', 'es', 'ar', 'id', 'pt', 'fr', 'ja', 'ru', 'de', 'it', 'ko',
      // 8 Bahasa Baru
      'hi', 'tr', 'vi', 'th', 'pl', 'nl', 'uk', 'sv'
    ],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },

  output: 'static',
});