import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distIndexPath = path.join(__dirname, 'dist', 'index.html');
const srcIndexPath = path.join(__dirname, 'index.html');

const now = new Date();
const vString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

console.log(`[Bump Cache] Bumping version to v=${vString}...`);

if (fs.existsSync(distIndexPath)) {
  let html = fs.readFileSync(distIndexPath, 'utf-8');
  html = html.replace(/(src="\/assets\/[^"]+?)(\?v=[^"]*)?(")/g, `$1?v=${vString}$3`);
  html = html.replace(/(href="\/assets\/[^"]+?)(\?v=[^"]*)?(")/g, `$1?v=${vString}$3`);
  fs.writeFileSync(distIndexPath, html);
  console.log(`[Bump Cache] ✅ Updated dist/index.html with v=${vString}`);
}

if (fs.existsSync(srcIndexPath)) {
  let html = fs.readFileSync(srcIndexPath, 'utf-8');
  html = html.replace(/(\/src\/styles\/index\.css)(\?v=[^"]*)?/g, `$1?v=${vString}`);
  fs.writeFileSync(srcIndexPath, html);
  console.log(`[Bump Cache] ✅ Updated index.html with v=${vString}`);
}
