#!/usr/bin/env node
// Translates English blog posts into the other languages using the Gemini API.
//
// Usage:
//   node scripts/translate.mjs --all                 translate every English post
//   node scripts/translate.mjs <before> <after>      translate posts changed between two git refs
//
// Environment:
//   GEMINI_API_KEY   required (unless TRANSLATE_MOCK=1)
//   GEMINI_MODEL     optional, defaults to gemini-3.5-flash
//   TRANSLATE_MOCK   set to 1 to test the file logic without calling the API
//
// Rules:
//   - Only title, description, tags and the body are translated. Every other
//     frontmatter field (pubDate, heroImage, draft, ...) is copied from English.
//   - Translated files carry `autoTranslated: true` and a `sourceHash`.
//     A translation that does NOT have autoTranslated is treated as hand-written
//     and is never overwritten or deleted.
//   - A translation is rejected (and retried) if any URL or code fence from the
//     English body is missing, so affiliate links cannot be lost.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';

const CONTENT_DIR = 'src/content/blog';
const SOURCE_LANG = 'en';
const TARGETS = {
  zh: 'Simplified Chinese',
  es: 'Spanish',
  ar: 'Arabic',
  id: 'Indonesian',
  pt: 'Portuguese',
  fr: 'French',
  ja: 'Japanese',
  ru: 'Russian',
  de: 'German',
  it: 'Italian',
  ko: 'Korean',
  hi: 'Hindi',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  pl: 'Polish',
  nl: 'Dutch',
  uk: 'Ukrainian',
  sv: 'Swedish',
};

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const API_KEY = process.env.GEMINI_API_KEY;
const MOCK = process.env.TRANSLATE_MOCK === '1';
const SOURCE_DIR = path.join(CONTENT_DIR, SOURCE_LANG);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let quotaExhausted = false; // set when the daily (per-day) quota is used up
const isPost = (f) => /\.mdx?$/.test(f);

if (!MOCK && !API_KEY) {
  console.error('GEMINI_API_KEY is not set. Add it in GitHub: Settings > Secrets and variables > Actions.');
  process.exit(1);
}

// ---------------------------------------------------------------- changes

function getChanges() {
  const args = process.argv.slice(2);
  const all = () => ({
    upserts: fs.existsSync(SOURCE_DIR) ? fs.readdirSync(SOURCE_DIR).filter(isPost) : [],
    deletes: [],
  });

  if (args[0] === '--all') return all();
  const [before, after] = args;
  if (!before || !after || /^0+$/.test(before)) return all();

  try {
    const out = execSync(`git diff --name-status --no-renames ${before} ${after} -- "${SOURCE_DIR}"`, {
      encoding: 'utf8',
    });
    const upserts = [];
    const deletes = [];
    for (const line of out.split('\n').filter(Boolean)) {
      const [status, file] = line.split('\t');
      const name = path.basename(file);
      if (!isPost(name)) continue;
      (status === 'D' ? deletes : upserts).push(name);
    }
    return { upserts, deletes };
  } catch {
    console.warn('Could not diff the given refs; translating every English post instead.');
    return all();
  }
}

// ----------------------------------------------------------------- Gemini

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
          body: { type: 'STRING' },
        },
        required: ['title', 'description', 'tags', 'body'],
      },
    },
  };

  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json = await res.json();
      const candidate = json.candidates?.[0];
      if (candidate?.finishReason === 'MAX_TOKENS') throw new Error('Response was cut off (MAX_TOKENS)');
      const text = (candidate?.content?.parts ?? [])
        .filter((p) => !p.thought)
        .map((p) => p.text ?? '')
        .join('');
      if (!text) throw new Error(`Empty response (finishReason: ${candidate?.finishReason ?? 'none'})`);
      return JSON.parse(text);
    }

    const errText = await res.text();

    // Daily quota used up: waiting a few minutes cannot fix it, so stop the whole run.
    if (res.status === 429 && /PerDay/i.test(errText)) {
      quotaExhausted = true;
      throw new Error('Daily Gemini quota exhausted. Re-run the workflow after the quota resets.');
    }

    if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 5) {
      // Gemini often says how long to wait: "retryDelay": "34s"
      const hinted = errText.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
      const hintMs = hinted ? Math.ceil(Number(hinted[1]) * 1000) + 1000 : 0;
      const wait = Math.max(10000 * 2 ** (attempt - 1), hintMs);
      console.warn(`  Gemini returned ${res.status}, retrying in${Math.round(wait / 1000)}s...`);
      await sleep(wait);
      continue;
    }
    throw new Error(`Gemini API ${res.status}:${errText.slice(0, 300)}`);
  }
}

function buildPrompt(payload, langName) {
  return `You are a professional translator for a business-software review website.
Translate the JSON below from English into ${langName}.

Rules:
- Write natural, fluent ${langName} for native readers. Keep the original tone and meaning.
- Translate only the values of "title", "description", "tags" and "body".
- "body" is Markdown. Keep its structure exactly: headings, lists, tables, bold/italic, blockquotes, code blocks.
- CRITICAL REQUIREMENT: You MUST preserve ALL URLs and links EXACTLY as they appear in the original text. Do not omit, truncate, alter, translate, or remove any URL or link target. Every single URL found in the source must be present in the translated output.
- Never change or translate: URLs, link targets, image paths, HTML tags and attributes, code, text inside backticks.
- Never translate or alter product, brand, or company names. Keep numbers, prices, and currency symbols as written.
- Do translate link text and image alt text.
- Do not add, remove, or summarize anything. Do not add commentary.
- Return only JSON with the keys: title, description, tags, body.

JSON to translate:
${JSON.stringify(payload)}`;
}

const urlsOf = (text) => new Set(text.match(/https?:\/\/[^\s)\]">'`]+/g) ?? []);
const fenceCount = (text) => (text.match(/^\s*```/gm) ?? []).length;

function validate(source, result) {
  if (!result || typeof result.body !== 'string' || !result.body.trim()) return 'empty body';
  if (typeof result.title !== 'string' || !result.title.trim()) return 'empty title';
  const found = urlsOf(result.body);
  const missing = [...urlsOf(source.body)].filter((u) => !found.has(u));
  if (missing.length) return `missing URLs: ${missing.join(', ')}`;
  if (fenceCount(source.body) !== fenceCount(result.body)) return 'code fences changed';
  return null;
}

async function translate(payload, lang, langName) {
  if (MOCK) {
    return {
      title: `[${lang}] ${payload.title}`,
      description: `[${lang}] ${payload.description}`,
      tags: payload.tags.map((t) => `[${lang}] ${t}`),
      body: `[${lang}]\n\n${payload.body}`,
    };
  }
  let lastProblem = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const result = await callGemini(buildPrompt(payload, langName));
    lastProblem = validate(payload, result) ?? '';
    if (!lastProblem) return result;
    console.warn(`  Rejected translation (${lastProblem}), attempt ${attempt}/4`);
    await sleep(5000); // keep the retry from bursting past the per-minute limit
  }
  throw new Error(`Translation failed validation: ${lastProblem}`);
}

// ------------------------------------------------------------------ files

function writeTranslation(outPath, srcData, tr, lang, hash) {
  const fm = { ...srcData, title: tr.title, description: tr.description };
  if ('tags' in srcData) fm.tags = tr.tags;
  if ('lang' in srcData) fm.lang = lang;
  fm.autoTranslated = true;
  fm.sourceHash = hash;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, matter.stringify(`${tr.body.trim()}\n`, fm));
}

async function processPost(file, failures) {
  const srcPath = path.join(SOURCE_DIR, file);
  if (!fs.existsSync(srcPath)) return;
  const { data, content } = matter(fs.readFileSync(srcPath, 'utf8'));

  if (data.draft === true) {
    console.log(`${file}: draft, skipped`);
    return;
  }

  const payload = {
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    body: content.trim(),
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);

  for (const [lang, langName] of Object.entries(TARGETS)) {
    const outPath = path.join(CONTENT_DIR, lang, file);

    if (fs.existsSync(outPath)) {
      const existing = matter(fs.readFileSync(outPath, 'utf8'));
      if (!existing.data.autoTranslated) {
        console.log(`${file} -> ${lang}: hand-written translation found, left untouched`);
        continue;
      }
      if (existing.data.sourceHash === hash) {
        // Text unchanged: only refresh non-translated fields (date, image, ...), no API call.
        writeTranslation(
          outPath,
          data,
          {
            title: String(existing.data.title ?? ''),
            description: String(existing.data.description ?? ''),
            tags: Array.isArray(existing.data.tags) ? existing.data.tags : [],
            body: existing.content,
          },
          lang,
          hash,
        );
        console.log(`${file} -> ${lang}: up to date`);
        continue;
      }
    }

    if (quotaExhausted) {
      console.warn(`${file} -> ${lang}: skipped (daily quota exhausted)`);
      failures.push(`${file} -> ${lang}: skipped, daily quota exhausted`);
      continue;
    }

    try {
      console.log(`${file} -> ${lang}: translating with ${MOCK ? 'mock' : MODEL}...`);
      const tr = await translate(payload, lang, langName);
      writeTranslation(outPath, data, tr, lang, hash);
    } catch (err) {
      console.error(`${file} -> ${lang}: FAILED: ${err.message}`);
      failures.push(`${file} -> ${lang}: ${err.message}`);
    } finally {
      // ~12 requests/min at most, under the 15/min free-tier limit
      if (!MOCK && !quotaExhausted) await sleep(5000);
    }
  }
}

function removeTranslations(file) {
  for (const lang of Object.keys(TARGETS)) {
    const outPath = path.join(CONTENT_DIR, lang, file);
    if (!fs.existsSync(outPath)) continue;
    const existing = matter(fs.readFileSync(outPath, 'utf8'));
    if (existing.data.autoTranslated) {
      fs.rmSync(outPath);
      console.log(`${file} -> ${lang}: removed (English post was deleted)`);
    } else {
      console.log(`${file} -> ${lang}: hand-written translation kept`);
    }
  }
}

// ------------------------------------------------------------------- main

const { upserts, deletes } = getChanges();
console.log(`English posts to translate: ${upserts.length}, deleted: ${deletes.length}`);

const failures = [];
for (const file of deletes) removeTranslations(file);
for (const file of upserts) {
  if (quotaExhausted) break;
  await processPost(file, failures);
}

if (failures.length) {
  console.error(`\n${failures.length} translation(s) failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
}