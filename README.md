# 🌐 Multilingual Blog — Astro + Decap CMS + Cloudflare

A multilingual blog supporting **9 languages** with Astro, Decap CMS, and Cloudflare Workers.

## Supported Languages

| Code | Language           | Direction |
|------|--------------------|----------|
| en   | English            | LTR      |
| zh   | 中文 (Chinese)      | LTR      |
| es   | Español (Spanish)  | LTR      |
| ar   | العربية (Arabic)    | RTL      |
| id   | Bahasa Indonesia   | LTR      |
| pt   | Português          | LTR      |
| fr   | Français           | LTR      |
| ja   | 日本語 (Japanese)   | LTR      |
| ru   | Русский (Russian)  | LTR      |

## Quick Start

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # production build
npm run deploy   # deploy to Cloudflare
```

## How Posting Works

1. Go to `/admin/` → login with GitHub
2. You'll see **9 collections** (one per language)
3. Write the same post in each language you want
4. Each post is saved as a Markdown file in `src/content/blog/<lang>/`
5. Astro builds separate pages: `/en/blog/post-slug`, `/id/blog/post-slug`, etc.
6. Visitors are auto-redirected based on their browser language

## Auto Language Detection

- Root page (`/`) detects visitor's browser language and redirects
- User's language choice is saved in localStorage
- Language switcher in header lets users change language anytime

## Setting Up Decap CMS Authentication

1. Go to [GitHub OAuth Apps](https://github.com/settings/developers) → New OAuth App
2. Set callback URL to `https://your-blog.workers.dev/callback`
3. Deploy an OAuth proxy (e.g. [decap-proxy](https://github.com/decaporg/decap-proxy) on a Worker)
4. Update `public/admin/config.yml` with your proxy URL

See [Decap CMS GitHub backend docs](https://decapcms.org/docs/github-backend/)

## Deploying to Cloudflare

### Via Dashboard
1. Push repo to GitHub
2. Workers & Pages → Create → Connect Git
3. Build: `npm run build`, Output: `dist`

### Via CLI
```bash
npm run build && npx wrangler deploy
```

## Adding a New Language

1. Add to `locales` in `astro.config.mjs`
2. Add UI strings in `src/i18n/ui.ts`
3. Add locale in `src/i18n/utils.ts` (`localeForLang`)
4. Create `src/content/blog/<new-lang>/`
5. Add collection in `public/admin/config.yml`

## License
MIT
