const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDir, 'sidepanel.html'), 'utf8');
const js = fs.readFileSync(path.join(rootDir, 'sidepanel.js'), 'utf8');
const cssPath = path.join(rootDir, 'src/styles/sidepanel.css');

assert(fs.existsSync(cssPath), 'src/styles/sidepanel.css must exist');
assert(html.includes('href="src/styles/sidepanel.css"'), 'sidepanel.html must link sidepanel.css');

const htmlIds = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g)).map((m) => m[1]));

const missingIds = [];
// Check literal string IDs in getElementById / setText / setHtml / flashElement
const literalCalls = js.matchAll(/(?:getElementById|setText|setHtml|flashElement)\(\s*'([^']+)'/g);
for (const m of literalCalls) {
  const id = m[1];
  if (!htmlIds.has(id)) missingIds.push(id);
}

// Check dynamic renderHero(prefix, ...) IDs for 'sp' and 'aff'
const heroSuffixes = [
  'comm-card',
  'breakeven-box',
  'signal-badge',
  'signal-title',
  'signal-sub',
  'net-comm',
  'gross-sub',
  'total-rate',
  'extra-pct',
  'base-pct',
  'bar-extra',
  'bar-base',
  'leg-extra',
  'leg-base',
  'price',
  'breakeven-text'
];
for (const prefix of ['sp', 'aff']) {
  for (const suffix of heroSuffixes) {
    const id = `drb-${prefix}-${suffix}`;
    if (!htmlIds.has(id)) missingIds.push(id);
  }
}

assert.strictEqual(missingIds.length, 0, `Missing DOM IDs in sidepanel.html: ${missingIds.join(', ')}`);
console.log(`✅ SIDEPANEL DOM PARITY PASSED: All ${htmlIds.size} HTML IDs verified (0 missing references in sidepanel.js).`);
