// Сборка для Vercel: копирует сайт в dist/ и подставляет реальный адрес
// в мета-теги превью (og:image должен быть абсолютной ссылкой).
// Адрес берётся из системных переменных Vercel; можно задать свой: SITE_URL=https://example.kz
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const host =
  process.env.SITE_URL ||
  (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  process.env.VERCEL_BRANCH_URL ||
  process.env.VERCEL_URL ||
  'localhost:3000';
const site = (host.startsWith('http') ? host : `https://${host}`).replace(/\/$/, '');

const files = [
  'index.html', 'banner.html', 'style.css', 'main.js', 'og-image.png',
  'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'site.webmanifest', 'robots.txt',
];
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const f of files) cpSync(f, `dist/${f}`);
const html = readFileSync('dist/index.html', 'utf8').replaceAll('__SITE_URL__', site);
writeFileSync('dist/index.html', html);
console.log(`dist/ готов, адрес сайта: ${site}`);
