// Builds the static preview: one bundle with hash routes (#pricing, #book, #app, #admin).
// In the Next.js project each view becomes app/<route>/page.tsx. Run: node preview/build.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'dist');
const globalModules = execSync('npm root -g').toString().trim();
let build;
try { ({ build } = await import('esbuild')); } catch { ({ build } = await import('/opt/npm-tools/node_modules/esbuild/lib/main.js')); }

fs.mkdirSync(out, { recursive: true });
await build({
  entryPoints: [path.join(root, 'src/main.tsx')], outdir: out, entryNames: 'app', bundle: true, minify: true,
  jsx: 'automatic', format: 'iife', target: 'es2020', nodePaths: [path.join(root, 'node_modules'), globalModules],
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning', loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.svg': 'text' },
});
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saatio · Smarter scheduling for salons, clinics, spas and gyms</title>
<meta name="description" content="Online booking, calendar, reminders and an AI receptionist for salons, clinics, spas and gyms in the UAE and the USA.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap">
<link rel="stylesheet" href="app.css">
</head>
<body>
<div id="root"></div>
<script src="app.js"></script>
</body>
</html>
`);
console.log('built', fs.readdirSync(out));

// Single-file page for the hosted preview: styles and script inlined.
const css = fs.readFileSync(path.join(out, 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(out, 'app.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(path.join(out, 'saatio.html'), `<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Saatio</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Saatio: booking and scheduling software with an AI receptionist. Concept project.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap">
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`);
console.log('artifact page', Math.round(fs.statSync(path.join(out, 'saatio.html')).size / 1024), 'KB');
