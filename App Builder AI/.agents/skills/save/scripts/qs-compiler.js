#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// QS Auto-Compiler Engine (scripts/qs-compiler.js)
// Assembles Quick Save artifacts + Git Diff into complete QS files in <50ms.
// Eliminates the 30-90s AI token generation bottleneck. | Version: 3.6.1
// ═══════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const startTime = Date.now();

// ─── 1. Resolve Target Quick Save File & Conv Flag ───────────────────────────
const rawArgs = process.argv.slice(2);
let convOverride = null;
const convIdx = rawArgs.indexOf('--conv');
if (convIdx !== -1 && rawArgs[convIdx + 1]) {
  convOverride = rawArgs[convIdx + 1].trim();
}

let targetFile = rawArgs.find(arg => !arg.startsWith('--') && arg !== convOverride);

if (!targetFile) {
  const searchDirs = [path.join(ROOT, 'Quick Save', 'Active')];

  // Dynamically discover ALL subdirectories under Quick Save/Complete/ (V3.6)
  const completeRoot = path.join(ROOT, 'Quick Save', 'Complete');
  if (fs.existsSync(completeRoot)) {
    for (const entry of fs.readdirSync(completeRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        searchDirs.push(path.join(completeRoot, entry.name));
      }
    }
  }

  let newestFile = null;
  let newestMtime = 0;

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    // Only scan top-level .md files (skip archive subdirs like V2/, V13/)
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isFile() && item.endsWith('.md') && !item.startsWith('.')) {
          if (stat.mtimeMs > newestMtime) {
            newestMtime = stat.mtimeMs;
            newestFile = full;
          }
        }
      } catch {}
    }
  }

  if (newestFile) {
    targetFile = path.relative(ROOT, newestFile);
  }
}

if (!targetFile) {
  console.log('⚡ [qs-compiler] No target Quick Save file found or specified. Exiting.');
  process.exit(0);
}

const fullTargetFile = path.resolve(ROOT, targetFile);
if (!fs.existsSync(fullTargetFile)) {
  console.error(`❌ [qs-compiler] Target file does not exist: ${fullTargetFile}`);
  process.exit(1);
}

let content = fs.readFileSync(fullTargetFile, 'utf8');
let modified = false;

// ─── 2. Parse Frontmatter & Extract Conversation ID ───────────────────────────
let convIds = [];
if (convOverride) {
  convIds.push(convOverride);
}

const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (fmMatch) {
  const convMatches = fmMatch[1].matchAll(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi);
  for (const m of convMatches) {
    if (!convIds.includes(m[1])) {
      convIds.push(m[1]);
    }
  }
}

// ─── Armor: Auto-Detect Conversation ID if Missing or Placeholder ─────────────
const hasPlaceholder = content.includes('<current-conv-id>') || content.includes('conversation-id-here');
if (convIds.length === 0 || hasPlaceholder) {
  const homeDir = os.homedir();
  const searchBases = [
    path.join(homeDir, '.gemini', 'antigravity-ide', 'brain'),
    path.join(homeDir, '.gemini', 'antigravity', 'brain'),
    path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity-ide', 'brain'),
    path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity', 'brain')
  ];

  let newestId = null;
  let newestMtime = 0;

  for (const b of searchBases) {
    if (!fs.existsSync(b)) continue;
    try {
      const dirs = fs.readdirSync(b);
      for (const d of dirs) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d)) {
          const s = fs.statSync(path.join(b, d));
          if (s.mtimeMs > newestMtime) {
            newestMtime = s.mtimeMs;
            newestId = d;
          }
        }
      }
    } catch {}
  }

  if (newestId && !convIds.includes(newestId)) {
    console.log(`💡 [qs-compiler] Auto-detected active conversation ID: ${newestId}`);
    convIds.push(newestId);
    if (content.includes('<current-conv-id>')) {
      content = content.replace(/<current-conv-id>/g, newestId);
      modified = true;
    } else if (content.includes('conversation-id-here')) {
      content = content.replace(/conversation-id-here/g, newestId);
      modified = true;
    } else if (!/conversation:\s*["']?[0-9a-f-]{10,}/i.test(content)) {
      content = content.replace(/^(---[\s\S]*?)(\r?\n---)/, `$1\nconversation: "${newestId}"$2`);
      modified = true;
    }
  }
}

// ─── Armor: Auto-Inject aliases if Missing or Empty ───────────────────────────
if (!/aliases:\s*\[.+\]/i.test(content)) {
  let fallbackAliases = [];
  const tagsMatch = content.match(/tags:\s*\[(.*?)\]/);
  if (tagsMatch && tagsMatch[1].trim()) {
    fallbackAliases = tagsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  } else {
    const baseName = path.basename(targetFile, '.md').replace(/^V\d+(\.\d+)*_\[.*?\]_/, '');
    fallbackAliases = baseName.split('_').filter(Boolean);
  }
  if (fallbackAliases.length === 0) fallbackAliases = ['general', 'quick-save'];
  
  const aliasesStr = `aliases: [${fallbackAliases.join(', ')}]`;
  if (/aliases:\s*(\[\])?/i.test(content)) {
    content = content.replace(/aliases:\s*(\[\])?/i, aliasesStr);
  } else {
    content = content.replace(/^(---[\s\S]*?)(\r?\n---)/, `$1\n${aliasesStr}$2`);
  }
  modified = true;
  console.log(`💡 [qs-compiler] Auto-injected missing aliases: ${aliasesStr}`);
}

if (convIds.length === 0) {
  console.log('ℹ️ [qs-compiler] No conversation ID found. Skipping artifact backup.');
}

// ─── 3. Locate & Read Brain Artifacts ─────────────────────────────────────────
let artifactBlocks = [];

for (const convId of convIds) {
  const homeDir = os.homedir();
  const possibleBrainDirs = [
    path.join(homeDir, '.gemini', 'antigravity-ide', 'brain', convId),
    path.join(homeDir, '.gemini', 'antigravity', 'brain', convId),
    path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity-ide', 'brain', convId),
    path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity', 'brain', convId)
  ];

  let brainDir = possibleBrainDirs.find(d => fs.existsSync(d));

  if (brainDir) {
    try {
      const items = fs.readdirSync(brainDir);
      for (const item of items) {
        if (!item.endsWith('.md')) continue;
        const itemPath = path.join(brainDir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isFile()) {
          const rawArtifact = fs.readFileSync(itemPath, 'utf8');
          const title = item.replace(/\.md$/, '').replace(/_/g, ' ');
          if (!artifactBlocks.some(a => a.filename === item)) {
            artifactBlocks.push({
              filename: item,
              title,
              content: rawArtifact
            });
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ [qs-compiler] Error reading brain artifacts: ${err.message}`);
    }
  } else {
    console.log(`ℹ️ [qs-compiler] Brain dir for conversation ${convId} not found on this machine.`);
  }
}

// ─── 4. Build or Merge Files Changed Table ─────────────────────────────────────
let filesChangedSectionRegex = /##\s*📋\s*Files Changed This Session[\s\S]*?(?=\r?\n##|$)/i;
const hasFilesChangedSection = filesChangedSectionRegex.test(content);

let changedFiles = [];
try {
  const statusOut = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
  if (statusOut) {
    statusOut.split(/\r?\n/).forEach(line => {
      const file = line.slice(3).trim();
      if (file && !file.includes('Quick Save/') && !changedFiles.includes(file)) {
        changedFiles.push(file);
      }
    });
  }

  // Also check recent commit diffs
  try {
    const logDiff = execSync('git diff --name-only HEAD~3 HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    if (logDiff) {
      logDiff.split(/\r?\n/).forEach(file => {
        file = file.trim();
        if (file && !file.includes('Quick Save/') && !changedFiles.includes(file)) {
          changedFiles.push(file);
        }
      });
    }
  } catch {}
} catch {}

function classifyScope(filePath) {
  if (/^scripts\//.test(filePath)) return 'Scripts / Automation';
  if (/^tools\//.test(filePath)) return 'Tools / Templates';
  if (/^routes\//.test(filePath)) return 'Backend / API Routes';
  if (/^lib\//.test(filePath)) return 'Core Library';
  if (/^public\//.test(filePath)) return 'Frontend / UI';
  if (/^\.agents\//.test(filePath)) return 'Agent Skills / Prompts';
  if (/^docs\//.test(filePath)) return 'Documentation';
  if (/^discord-bot\//.test(filePath)) return 'Discord Bot';
  if (/^data\//.test(filePath)) return 'Runtime Data';
  return 'Core Repository';
}

// ─── 5. Inject / Merge Artifacts (Idempotent) ──────────────────────────────────
if (artifactBlocks.length > 0) {
  const rawArtifactRegex = /##\s*📦\s*RAW ARTIFACT BACKUP[^\r\n]*([\s\S]*?)(?=\r?\n##|$)/i;
  const match = content.match(rawArtifactRegex);

  let artifactsToAdd = [];
  for (const block of artifactBlocks) {
    // Check if block is already embedded
    const alreadyPresent = match && (match[1].includes(block.filename) || match[1].includes(block.title));
    if (!alreadyPresent) {
      artifactsToAdd.push(`
<details>
<summary>Click to view ${block.title} (${block.filename} — 100% Raw Copy)</summary>

${block.content}

</details>`);
    }
  }

  if (artifactsToAdd.length > 0) {
    const combinedNewArtifacts = artifactsToAdd.join('\n\n');
    if (match) {
      // Append inside existing section
      const fullExistingSection = match[0];
      const updatedSection = fullExistingSection + '\n' + combinedNewArtifacts;
      content = content.replace(fullExistingSection, updatedSection);
      modified = true;
    } else {
      // Create new section
      const newSection = `\n\n## 📦 RAW ARTIFACT BACKUP (Iron Rule)\n${combinedNewArtifacts}\n`;
      // Try to insert before Timeline, Backlinks, or bottom
      if (/##\s*🔬\s*Timeline/i.test(content)) {
        content = content.replace(/(##\s*🔬\s*Timeline)/i, `${newSection}\n$1`);
      } else if (/##\s*🔗\s*GBRAIN/i.test(content)) {
        content = content.replace(/(##\s*🔗\s*GBRAIN)/i, `${newSection}\n$1`);
      } else {
        content += newSection;
      }
      modified = true;
    }
    console.log(`📦 [qs-compiler] Injected ${artifactsToAdd.length} artifact(s) into RAW ARTIFACT BACKUP.`);
  } else {
    console.log('ℹ️ [qs-compiler] All artifacts already present in RAW ARTIFACT BACKUP.');
  }
}

// If Files Changed table is missing or empty, inject table
if (!hasFilesChangedSection) {
  const tableRows = changedFiles.length > 0
    ? changedFiles.map(f => `| \`${f}\` | Auto-detected session change | ${classifyScope(f)} |`).join('\n')
    : '| `(session)` | Auto-recorded workflow execution | Core Workspace |';
  const filesSection = `\n\n## 📋 Files Changed This Session\n| File | What Changed | Scope |\n|---|---|---|\n${tableRows}\n`;
  if (/##\s*📦\s*RAW ARTIFACT/i.test(content)) {
    content = content.replace(/(##\s*📦\s*RAW ARTIFACT)/i, `${filesSection}\n$1`);
    modified = true;
  } else if (/##\s*🔬\s*Timeline/i.test(content)) {
    content = content.replace(/(##\s*🔬\s*Timeline)/i, `${filesSection}\n$1`);
    modified = true;
  } else {
    content += filesSection;
    modified = true;
  }
}

// ─── 5.5: Normalize & Auto-Scaffold Missing Mandatory Sections ──────────────
// Check if Context & Implementation heading exists (even with slight variation)
const contextRegex = /##\s*📌?\s*Context\s*&\s*Implementation/i;
if (!contextRegex.test(content)) {
  // If there's an Architecture or Implementation heading, normalize it
  const similarHeadingRegex = /##\s*[\p{Emoji}\u200d\uFE0F\w\s]*?(Architecture|Implementation Details|Technical Overview)[\s\S]*?(?=\r?\n|$)/iu;
  if (similarHeadingRegex.test(content)) {
    content = content.replace(similarHeadingRegex, `## 📌 Context & Implementation (Compiled Truth)`);
    modified = true;
    console.log(`🔧 [qs-compiler] Normalized existing architecture/implementation heading to: Context & Implementation (Compiled Truth)`);
  } else {
    // Scaffold it after the main H1 or Frontmatter
    const scaffoldContext = `\n\n## 📌 Context & Implementation (Compiled Truth)\n(Auto-compiled architecture and implementation record)\n`;
    if (/#\s+[^\r\n]+/i.test(content)) {
      content = content.replace(/(#\s+[^\r\n]+)/i, `$1${scaffoldContext}`);
    } else {
      content += scaffoldContext;
    }
    modified = true;
    console.log(`🔧 [qs-compiler] Auto-scaffolded missing section: Context & Implementation (Compiled Truth)`);
  }
}

const mandatoryScaffolds = [
  {
    name: 'RAW ARTIFACT BACKUP (Iron Rule)',
    regex: /##\s*📦\s*RAW\s*ARTIFACT\s*BACKUP/i,
    section: `\n\n## 📦 RAW ARTIFACT BACKUP (Iron Rule)\n> Auto-generated by qs-compiler.js — No standalone brain artifacts detected for this session.\n> Context is fully captured in the compiled implementation notes and git diff log above.\n`
  },
  {
    name: 'Timeline & Debugging Log',
    regex: /##\s*🔬\s*Timeline/i,
    section: `\n\n## 🔬 Timeline & Debugging Log\n- ${new Date().toLocaleTimeString('en-US', { hour12: false })} — Auto-compiled session record\n`
  },
  {
    name: 'GBRAIN Backlinks',
    regex: /##\s*🔗\s*GBRAIN\s*Backlinks/i,
    section: `\n\n## 🔗 GBRAIN Backlinks\n- **${new Date().toISOString().slice(0, 10)}** | Auto-compiled session checkpoint\n`
  }
];

for (const s of mandatoryScaffolds) {
  if (!s.regex.test(content)) {
    content += s.section;
    modified = true;
    console.log(`🔧 [qs-compiler] Auto-scaffolded missing section: ${s.name}`);
  }
}

if (modified) {
  fs.writeFileSync(fullTargetFile, content, 'utf8');
  console.log(`✅ [qs-compiler] Updated: ${targetFile}`);
} else {
  console.log(`ℹ️ [qs-compiler] No changes needed for: ${targetFile}`);
}

const elapsedMs = Date.now() - startTime;
console.log(`⚡ [qs-compiler] Completed in ${elapsedMs}ms.`);
process.exit(0);
