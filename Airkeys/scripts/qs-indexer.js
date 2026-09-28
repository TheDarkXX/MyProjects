#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Universal Search Manifest Indexer (qs-indexer.js)
// Scans all 6 knowledge sources → generates search-manifest.json
// Usage:
//   node scripts/qs-indexer.js                  # Full index (Phase A only)
//   node scripts/qs-indexer.js --enrich         # Phase A + B (AI keywords)
//   node scripts/qs-indexer.js --incremental    # Only changed files
// ═══════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Config ───────────────────────────────────────────────────────────────────
const QUICK_SAVE_DIR = path.join(ROOT, 'Quick Save');
const DOCS_DIR = path.join(ROOT, 'docs');
const MEMORY_DIR = path.join(ROOT, 'memory');
const SELF_IMPROVING_DIR = path.join(ROOT, 'self-improving');

// AG brain paths (local Windows dev)
const BRAIN_BASE = process.env.AG_BRAIN_PATH ||
  (process.platform === 'win32'
    ? (existsSync(path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', '.gemini', 'antigravity-ide'))
        ? path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', '.gemini', 'antigravity-ide')
        : path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', '.gemini', 'antigravity'))
    : (existsSync(path.join(process.env.HOME || '/root', '.gemini', 'antigravity-ide'))
        ? path.join(process.env.HOME || '/root', '.gemini', 'antigravity-ide')
        : path.join(process.env.HOME || '/root', '.gemini', 'antigravity')));
const KNOWLEDGE_DIR = path.join(BRAIN_BASE, 'knowledge');
const CONVERSATIONS_DIR = path.join(BRAIN_BASE, 'brain');

const MANIFEST_PATH = path.join(ROOT, 'search-manifest.md');

// ─── CLI Args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const ENRICH = args.includes('--enrich');
const INCREMENTAL = args.includes('--incremental');

// ─── YAML Frontmatter Parser (lightweight, no dependency) ─────────────────────
function parseYamlFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yaml = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    // Array continuation
    if (currentArray && /^\s+-\s+/.test(line)) {
      currentArray.push(line.replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, '').trim());
      continue;
    } else if (currentArray) {
      yaml[currentKey] = currentArray;
      currentArray = null;
      currentKey = null;
    }

    // Multi-line value (>)
    const multiMatch = line.match(/^(\w[\w_-]*):\s*>\s*$/);
    if (multiMatch) {
      currentKey = multiMatch[1];
      // Collect next lines until next key
      continue;
    }

    // Key: value
    const kvMatch = line.match(/^(\w[\w_-]*):\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let val = kvMatch[2].trim();

      // Inline array: [a, b, c]
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        yaml[key] = val;
        continue;
      }

      // Remove quotes
      val = val.replace(/^["']|["']$/g, '');
      yaml[key] = val;
      continue;
    }

    // Array start
    const arrMatch = line.match(/^(\w[\w_-]*):\s*$/);
    if (arrMatch) {
      currentKey = arrMatch[1];
      currentArray = [];
      continue;
    }

    // Multi-line summary continuation
    if (currentKey && /^\s{2,}/.test(line)) {
      const existing = yaml[currentKey] || '';
      yaml[currentKey] = (existing + ' ' + line.trim()).trim();
    }
  }

  if (currentArray && currentKey) {
    yaml[currentKey] = currentArray;
  }

  return yaml;
}

// ─── File Hash ────────────────────────────────────────────────────────────────
function fileHash(filepath) {
  try {
    const content = readFileSync(filepath);
    return createHash('md5').update(content).digest('hex');
  } catch { return null; }
}

// ─── Extract component from filename ──────────────────────────────────────────
function extractComponent(filename) {
  // V3.8.1_[impl]_payment_desc.md → "payment"
  const match = filename.match(/V[\d.]+_\[\w+\]_([^_]+)/);
  return match ? match[1] : null;
}

// ─── Extract title from markdown ──────────────────────────────────────────────
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/[🔴🟢🟡⚠️✅❌🚀🔥💡🎯📌📋🔧🛠️📦🔬🔗🏗️📊🤖💾🧠⛔🔍]/g, '').trim() : null;
}

// ─── Scan Quick Save ──────────────────────────────────────────────────────────
function scanQuickSave() {
  const entries = [];
  if (!existsSync(QUICK_SAVE_DIR)) return entries;

  function walk(dir, relBase = '') {
    for (const item of readdirSync(dir)) {
      if (item.startsWith('.') || item === 'qs-manifest.json') continue;
      const full = path.join(dir, item);
      const rel = path.join(relBase, item);
      const stat = statSync(full);

      if (stat.isDirectory()) {
        walk(full, rel);
      } else if (item.endsWith('.md')) {
        try {
          const content = readFileSync(full, 'utf-8');
          const yaml = parseYamlFrontmatter(content);
          const component = extractComponent(item) || yaml.component || '';
          const title = extractTitle(content) || yaml.conversation_title || item.replace('.md', '');

          entries.push({
            source: 'quick_save',
            file: `Quick Save/${rel.replace(/\\/g, '/')}`,
            hash: fileHash(full),
            title,
            version: yaml.version || null,
            type: yaml.type || null,
            status: yaml.status || null,
            component,
            tags: Array.isArray(yaml.tags) ? yaml.tags : [],
            aliases: Array.isArray(yaml.aliases) ? yaml.aliases : [],
            summary: (yaml.summary || '').slice(0, 500),
            search_keywords: [] // Filled by Phase B
          });
        } catch (e) {
          console.error(`[SKIP] ${rel}: ${e.message}`);
        }
      }
    }
  }

  walk(QUICK_SAVE_DIR);
  return entries;
}

// ─── Scan docs/ ───────────────────────────────────────────────────────────────
function scanDocs() {
  const entries = [];
  if (!existsSync(DOCS_DIR)) return entries;

  function walk(dir, relBase = '') {
    for (const item of readdirSync(dir)) {
      if (item.startsWith('.')) continue;
      const full = path.join(dir, item);
      const rel = path.join(relBase, item);
      const stat = statSync(full);

      if (stat.isDirectory()) {
        walk(full, rel);
      } else if (item.endsWith('.md')) {
        try {
          const content = readFileSync(full, 'utf-8');
          const title = extractTitle(content) || item.replace('.md', '');
          const snippet = content.replace(/^---[\s\S]*?---/, '').trim().slice(0, 300);

          entries.push({
            source: 'docs',
            file: `docs/${rel.replace(/\\/g, '/')}`,
            hash: fileHash(full),
            title,
            summary: snippet.replace(/\n/g, ' ').trim(),
            search_keywords: []
          });
        } catch (e) {
          console.error(`[SKIP] docs/${rel}: ${e.message}`);
        }
      }
    }
  }

  walk(DOCS_DIR);
  return entries;
}

// ─── Scan Knowledge Items ─────────────────────────────────────────────────────
function scanKnowledgeItems() {
  const entries = [];
  if (!existsSync(KNOWLEDGE_DIR)) return entries;

  for (const item of readdirSync(KNOWLEDGE_DIR)) {
    const metaPath = path.join(KNOWLEDGE_DIR, item, 'metadata.json');
    if (!existsSync(metaPath)) continue;

    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      entries.push({
        source: 'knowledge_item',
        file: `knowledge/${item}/metadata.json`,
        ki_name: item,
        title: meta.title || meta.name || item,
        summary: (meta.summary || meta.description || '').slice(0, 500),
        tags: meta.tags || [],
        search_keywords: []
      });
    } catch (e) {
      console.error(`[SKIP] KI ${item}: ${e.message}`);
    }
  }

  return entries;
}

// ─── Scan Conversations ───────────────────────────────────────────────────────
function scanConversations() {
  const entries = [];
  if (!existsSync(CONVERSATIONS_DIR)) return entries;

  for (const convId of readdirSync(CONVERSATIONS_DIR)) {
    const convDir = path.join(CONVERSATIONS_DIR, convId);
    if (!statSync(convDir).isDirectory()) continue;

    const overviewPath = path.join(convDir, '.system_generated', 'logs', 'overview.txt');
    if (!existsSync(overviewPath)) continue;

    try {
      const overview = readFileSync(overviewPath, 'utf-8');
      const lines = overview.split('\n').filter(l => l.trim());

      // Extract first user request for context
      let firstUserMsg = '';
      let convTitle = convId;
      let convDate = '';

      for (const line of lines.slice(0, 10)) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.source === 'USER_EXPLICIT' && parsed.content && !firstUserMsg) {
            // Extract the actual request text, stripping XML tags
            firstUserMsg = parsed.content
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 400);
          }
          if (parsed.created_at && !convDate) {
            convDate = parsed.created_at.slice(0, 10);
          }
        } catch { continue; }
      }

      // Try to find conversation title from artifacts
      const artifactFiles = [];
      try {
        for (const f of readdirSync(convDir)) {
          if (f.endsWith('.md') && !f.startsWith('.')) {
            artifactFiles.push(f);
            // Read artifact for title hints
            const artifactContent = readFileSync(path.join(convDir, f), 'utf-8');
            const t = extractTitle(artifactContent);
            if (t && t.length > convTitle.length) convTitle = t;
          }
        }
      } catch {}

      // Build searchable summary from first user message
      const summary = firstUserMsg || `Conversation ${convId}`;

      entries.push({
        source: 'conversation',
        file: `brain/${convId}/.system_generated/logs/overview.txt`,
        conversation_id: convId,
        title: convTitle.slice(0, 200),
        date: convDate,
        artifacts: artifactFiles,
        summary: summary.slice(0, 500),
        search_keywords: []
      });
    } catch (e) {
      console.error(`[SKIP] Conv ${convId}: ${e.message}`);
    }
  }

  return entries;
}

// ─── Scan Memory + Self-Improving ─────────────────────────────────────────────
function scanMiscFiles() {
  const entries = [];
  const dirs = [
    { dir: MEMORY_DIR, source: 'memory', prefix: 'memory' },
    { dir: SELF_IMPROVING_DIR, source: 'self_improving', prefix: 'self-improving' },
  ];

  for (const { dir, source, prefix } of dirs) {
    if (!existsSync(dir)) continue;
    for (const item of readdirSync(dir)) {
      if (!item.endsWith('.md') && !item.endsWith('.jsonl')) continue;
      const full = path.join(dir, item);
      try {
        const content = readFileSync(full, 'utf-8');
        const title = extractTitle(content) || item;
        entries.push({
          source,
          file: `${prefix}/${item}`,
          hash: fileHash(full),
          title,
          summary: content.replace(/^---[\s\S]*?---/, '').trim().slice(0, 300).replace(/\n/g, ' '),
          search_keywords: []
        });
      } catch {}
    }
  }

  return entries;
}

// ─── Parse Single File for True Incremental Indexing ─────────────────────────
function parseSingleFile(relPath) {
  const normRel = relPath.replace(/\\/g, '/');
  const full = path.join(ROOT, normRel);
  if (!existsSync(full)) return null;

  try {
    const filename = path.basename(normRel);
    const content = readFileSync(full, 'utf-8');

    if (normRel.startsWith('Quick Save/')) {
      const yaml = parseYamlFrontmatter(content);
      const component = extractComponent(filename) || yaml.component || '';
      const title = extractTitle(content) || yaml.conversation_title || filename.replace('.md', '');
      return {
        source: 'quick_save',
        file: normRel,
        hash: fileHash(full),
        title,
        version: yaml.version || null,
        type: yaml.type || null,
        status: yaml.status || null,
        component,
        tags: Array.isArray(yaml.tags) ? yaml.tags : [],
        aliases: Array.isArray(yaml.aliases) ? yaml.aliases : [],
        summary: (yaml.summary || '').slice(0, 500),
        search_keywords: []
      };
    } else if (normRel.startsWith('docs/')) {
      const title = extractTitle(content) || filename.replace('.md', '');
      const snippet = content.replace(/^---[\s\S]*?---/, '').trim().slice(0, 300);
      return {
        source: 'docs',
        file: normRel,
        hash: fileHash(full),
        title,
        summary: snippet.replace(/\n/g, ' ').trim(),
        search_keywords: []
      };
    } else if (normRel.startsWith('memory/') || normRel.startsWith('self-improving/')) {
      const title = extractTitle(content) || filename;
      const source = normRel.startsWith('memory/') ? 'memory' : 'self_improving';
      return {
        source,
        file: normRel,
        hash: fileHash(full),
        title,
        summary: content.replace(/^---[\s\S]*?---/, '').trim().slice(0, 300).replace(/\n/g, ' '),
        search_keywords: []
      };
    }
  } catch (e) {
    console.error(`[parseSingleFile SKIP] ${normRel}: ${e.message}`);
  }
  return null;
}

// ─── Phase B: AI Keyword Enrichment ───────────────────────────────────────────
async function enrichKeywords(entries) {
  // Load API key
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const envPath = path.join(ROOT, '.env');
    if (existsSync(envPath)) {
      const env = readFileSync(envPath, 'utf-8');
      const match = env.match(/GEMINI_API_KEY=([^\r\n]+)/);
      if (match) apiKey = match[1].trim();
    }
  }

  if (!apiKey) {
    console.log('[Phase B] No GEMINI_API_KEY found — skipping keyword enrichment');
    return;
  }

  const GATEWAY_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  let enriched = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Skip if already has keywords
    if (entry.search_keywords && entry.search_keywords.length > 0) {
      skipped++;
      continue;
    }

    const text = [
      entry.title || '',
      entry.summary || '',
      (entry.tags || []).join(', '),
      (entry.aliases || []).join(', '),
      entry.component || '',
    ].filter(Boolean).join(' ').slice(0, 600);

    if (text.length < 10) { skipped++; continue; }

    let retries = 0;
    while (retries < 3) {
      try {
        const res = await fetch(`${GATEWAY_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Claw-Cron': 'none',
            'X-Agent-Id': 'qs-indexer',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate 10-15 search keywords for this document. Include:
- Thai keywords (คำภาษาไทย)
- English keywords
- Abbreviations (e.g. "fb" for "facebook")
- Synonyms and related terms
- Action verbs (e.g. "ดึงข้อมูล", "scrape", "โพส")

Document:
${text}

Return ONLY a JSON array of strings, no explanation. Example: ["keyword1", "คีย์เวิร์ด2", "abbrev3"]` }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: "application/json" }
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
          try {
            const keywords = JSON.parse(cleaned);
            if (Array.isArray(keywords)) {
              entry.search_keywords = keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean).slice(0, 15);
              enriched++;
              break; // Success
            } else {
              skipped++;
              break; // Parse failed but request succeeded
            }
          } catch {
            console.error(`[Phase B] Failed to parse keywords for: ${entry.title?.slice(0, 40)}`);
            skipped++;
            break;
          }
        } else if (res.status === 429) {
          console.error(`[Phase B] 429 Rate Limit for ${entry.title?.slice(0, 40)}. Waiting 20s...`);
          await new Promise(r => setTimeout(r, 20000));
          retries++;
          continue; // Retry
        } else {
          const errData = await res.text();
          console.error(`[Phase B] HTTP Error ${res.status} for ${entry.title?.slice(0, 40)}: ${errData}`);
          skipped++;
          break;
        }
      } catch (e) {
        console.error(`[Phase B] API error for ${entry.title?.slice(0, 40)}: ${e.message}`);
        skipped++;
        break;
      }
    }

    if (retries >= 3) {
      console.error(`[Phase B] Max retries reached for ${entry.title?.slice(0, 40)}`);
      skipped++;
    }

    const processed = enriched + skipped;
    if (processed % 10 === 0) {
      console.log(`[Phase B] Progress: ${enriched} enriched, ${skipped} skipped, ${entries.length - processed} remaining`);
    }
  }

  console.log(`[Phase B] Done: ${enriched} enriched, ${skipped} skipped`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Universal Search Manifest Indexer');
  console.log('═══════════════════════════════════════════════════════════');

  // True Incremental Mode (Fast Git-Diff path)
  if (INCREMENTAL && !ENRICH && existsSync(MANIFEST_PATH)) {
    const startMs = Date.now();
    let targetFiles = [];

    // Explicit files from CLI
    const explicitFiles = args.filter(a => !a.startsWith('--'));
    if (explicitFiles.length > 0) {
      targetFiles = explicitFiles.map(f => path.relative(ROOT, path.resolve(ROOT, f)).replace(/\\/g, '/'));
    } else {
      try {
        const gitStatus = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' });
        const gitDiff = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf-8' });
        const rawLines = [...gitStatus.split('\n'), ...gitDiff.split('\n')];
        const fileSet = new Set();

        for (const line of rawLines) {
          if (!line.trim()) continue;
          let filePath = line.trim();
          if (/^[ MADRCU?!]{1,2}\s+/.test(line)) {
            filePath = line.slice(3).trim();
          }
          if (filePath.includes(' -> ')) {
            filePath = filePath.split(' -> ')[1].trim();
          }
          filePath = filePath.replace(/\\/g, '/');
          if (filePath.endsWith('.md') && 
              (filePath.startsWith('Quick Save/') || 
               filePath.startsWith('docs/') || 
               filePath.startsWith('memory/') || 
               filePath.startsWith('self-improving/'))) {
            fileSet.add(filePath);
          }
        }
        targetFiles = Array.from(fileSet);
      } catch (err) {
        console.warn(`[Incremental] Git diff failed (${err.message}). Falling back to full scan.`);
      }
    }

    if (targetFiles.length > 0) {
      console.log(`[True Incremental] Detected ${targetFiles.length} changed documentation files:`);
      targetFiles.forEach(f => console.log(`  - ${f}`));

      const content = readFileSync(MANIFEST_PATH, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const manifestMap = new Map();
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.file) manifestMap.set(entry.file, entry);
        } catch {}
      }

      let updatedCount = 0;
      let removedCount = 0;

      for (const relPath of targetFiles) {
        const fullPath = path.join(ROOT, relPath);
        if (!existsSync(fullPath)) {
          if (manifestMap.has(relPath)) {
            manifestMap.delete(relPath);
            removedCount++;
          }
          continue;
        }

        const newEntry = parseSingleFile(relPath);
        if (newEntry) {
          const existing = manifestMap.get(relPath);
          if (existing && existing.search_keywords?.length > 0) {
            newEntry.search_keywords = existing.search_keywords;
          }
          manifestMap.set(relPath, newEntry);
          updatedCount++;
        }
      }

      const allEntries = Array.from(manifestMap.values());
      const sourceOrder = { quick_save: 0, docs: 1, knowledge_item: 2, conversation: 3, memory: 4, self_improving: 5 };
      allEntries.sort((a, b) => (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99));

      const jsonlContent = allEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
      writeFileSync(MANIFEST_PATH, jsonlContent, 'utf-8');
      const elapsed = Date.now() - startMs;
      console.log(`\n✅ [True Incremental] Updated ${updatedCount} entries, removed ${removedCount} entries in ${elapsed}ms!`);
      console.log(`   Manifest has ${allEntries.length} total entries (${(statSync(MANIFEST_PATH).size / 1024).toFixed(1)} KB)`);
      return;
    } else {
      console.log(`\n✅ [True Incremental] No documentation changes detected. Manifest is up to date.`);
      return;
    }
  }

  // Load existing manifest for incremental mode
  let existingManifest = [];
  if (INCREMENTAL && existsSync(MANIFEST_PATH)) {
    try {
      const content = readFileSync(MANIFEST_PATH, 'utf-8');
      existingManifest = content.trim().split('\n').map(line => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);
      console.log(`[Incremental] Loaded existing manifest: ${existingManifest.length} entries`);
    } catch {}
  }

  // Phase A: Scan all sources
  console.log('\n[Phase A] Scanning all knowledge sources...');

  const quickSave = scanQuickSave();
  console.log(`  Quick Save: ${quickSave.length} files`);

  const docs = scanDocs();
  console.log(`  docs/: ${docs.length} files`);

  const kis = scanKnowledgeItems();
  console.log(`  Knowledge Items: ${kis.length} items`);

  const convos = scanConversations();
  console.log(`  Conversations: ${convos.length} conversations`);

  const misc = scanMiscFiles();
  console.log(`  memory + self-improving: ${misc.length} files`);

  let allEntries = [...quickSave, ...docs, ...kis, ...convos, ...misc];
  console.log(`\n  Total: ${allEntries.length} entries`);

  // Incremental: preserve existing keywords for unchanged files
  if (INCREMENTAL && existingManifest.length > 0) {
    const existingMap = new Map();
    for (const e of existingManifest) {
      existingMap.set(e.file, e);
    }

    let preserved = 0;
    for (const entry of allEntries) {
      const existing = existingMap.get(entry.file);
      if (existing && existing.hash === entry.hash && existing.search_keywords?.length > 0) {
        entry.search_keywords = existing.search_keywords;
        preserved++;
      }
    }
    console.log(`[Incremental] Preserved keywords for ${preserved} unchanged files`);
  }

  // Phase B: AI Keyword Enrichment (only with --enrich flag)
  if (ENRICH) {
    console.log('\n[Phase B] AI Keyword Enrichment...');
    await enrichKeywords(allEntries);
  }

  // Write manifest
  // Sort: quick_save first, then docs, ki, conversations, misc
  const sourceOrder = { quick_save: 0, docs: 1, knowledge_item: 2, conversation: 3, memory: 4, self_improving: 5 };
  allEntries.sort((a, b) => (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99));

  // JSONL format: one JSON object per line → grep matches keyword + filepath on same line
  const jsonlContent = allEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
  writeFileSync(MANIFEST_PATH, jsonlContent, 'utf-8');
  console.log(`\n✅ Manifest written: ${MANIFEST_PATH}`);
  console.log(`   ${allEntries.length} entries, ${(statSync(MANIFEST_PATH).size / 1024).toFixed(1)} KB`);

  // Stats
  const stats = {};
  for (const e of allEntries) {
    stats[e.source] = (stats[e.source] || 0) + 1;
  }
  console.log('\n📊 Breakdown:');
  for (const [source, count] of Object.entries(stats)) {
    const enrichedCount = allEntries.filter(e => e.source === source && e.search_keywords?.length > 0).length;
    console.log(`   ${source}: ${count} entries (${enrichedCount} enriched)`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
