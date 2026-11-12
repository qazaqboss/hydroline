// Сборка для Vercel: копирует сайт в dist/ и подставляет реальный адрес
// в мета-теги превью (og:image должен быть абсолютной ссылкой).
// По умолчанию hydroline-zeta.vercel.app; свой домен: переменная SITE_URL=https://example.kz
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const DEFAULT_URL = 'https://hydroline-zeta.vercel.app';
const site = (process.env.SITE_URL || DEFAULT_URL).replace(/\/$/, '');

const files = [
  'index.html', 'banner.html', 'style.css', 'main.js', 'og-image.png',
  'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'site.webmanifest', 'robots.txt',
];
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const f of files) cpSync(f, `dist/${f}`);
const html = readFileSync('dist/index.html', 'utf8').replaceAll(DEFAULT_URL, site);
writeFileSync('dist/index.html', html);
console.log(`dist/ готов, адрес сайта: ${site}`);
