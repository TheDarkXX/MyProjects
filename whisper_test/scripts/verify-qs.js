#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// Quick Save Quality Gate (scripts/verify-qs.js)
// Enforces that NO Quick Save file cuts corners or skips raw artifacts/chat context
// ═══════════════════════════════════════════════════════════════════════════

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  console.error('❌ [QS GATE ERROR] Target Quick Save file not provided or does not exist:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const errors = [];

// 1. Frontmatter Validation
if (!content.startsWith('---')) {
  errors.push('Missing YAML Frontmatter starting with ---');
}
const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!frontmatterMatch) {
  errors.push('Malformed YAML Frontmatter');
} else {
  const fm = frontmatterMatch[1];
  if (!/conversation:\s*["']?[a-f0-9-]{10,}/i.test(fm)) {
    errors.push('YAML Frontmatter missing valid "conversation" ID');
  }
  if (!/aliases:\s*\[.+\]/i.test(fm)) {
    errors.push('YAML Frontmatter missing "aliases: [...]"');
  }
  if (!/summary:\s*>/i.test(fm) && !/summary:\s*["'].+["']/i.test(fm)) {
    errors.push('YAML Frontmatter missing "summary"');
  }
}

// 2. Mandatory Section Headings Check
const requiredHeadings = [
  { name: 'Context & Implementation (Compiled Truth)', regex: /##\s*📌\s*Context\s*&\s*Implementation/i },
  { name: 'Files Changed This Session', regex: /##\s*📋\s*Files\s*Changed/i },
  { name: 'RAW ARTIFACT BACKUP (Iron Rule)', regex: /##\s*📦\s*RAW\s*ARTIFACT\s*BACKUP/i },
  { name: 'Timeline & Debugging Log', regex: /##\s*🔬\s*Timeline/i },
  { name: 'GBRAIN Backlinks', regex: /##\s*🔗\s*GBRAIN\s*Backlinks/i }
];

for (const h of requiredHeadings) {
  if (!h.regex.test(content)) {
    errors.push(`Missing mandatory section: "${h.name}"`);
  }
}

// 3. RAW ARTIFACT BACKUP Depth Check
const artifactMatch = content.match(/##\s*📦\s*RAW\s*ARTIFACT\s*BACKUP[\s\S]*?(?=##\s*🔬|$)/i);
if (artifactMatch) {
  const sectionContent = artifactMatch[0].trim();
  const lines = sectionContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 3) {
    errors.push('RAW ARTIFACT BACKUP section is practically empty (< 3 non-empty lines).');
  }
}

// 4. File Size Sanity Check (must be >= 4 KB for non-trivial saves)
const stat = fs.statSync(filePath);
if (stat.size < 4000) {
  errors.push(`Quick Save file is suspiciously small (${stat.size} bytes < 4000 bytes). A deep save must capture full context.`);
}

// 5. Brain Artifact Auto-Inspection
// If the conversation contains implementation_plan.md or walkthrough.md in antigravity-ide/brain, verify it is present
const convIdMatch = content.match(/conversation:\s*["']?([a-f0-9-]{10,})["']?/i);
if (convIdMatch) {
  const convId = convIdMatch[1];
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\Admin';
  const brainDir = path.join(userProfile, '.gemini', 'antigravity-ide', 'brain', convId);
  if (fs.existsSync(brainDir)) {
    const planPath = path.join(brainDir, 'implementation_plan.md');
    if (fs.existsSync(planPath)) {
      if (!content.includes('implementation_plan.md') && !content.includes('Implementation Plan')) {
        errors.push(`Found 'implementation_plan.md' in session brain (${planPath}) but it was NOT backed up in this Quick Save file!`);
      }
    }
    const walkthroughPath = path.join(brainDir, 'walkthrough.md');
    if (fs.existsSync(walkthroughPath)) {
      if (!content.includes('walkthrough.md') && !content.includes('Walkthrough')) {
        errors.push(`Found 'walkthrough.md' in session brain (${walkthroughPath}) but it was NOT backed up in this Quick Save file!`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`\n❌ [QS QUALITY GATE FAILED] ${path.basename(filePath)} violates Iron Rules:`);
  errors.forEach(e => console.error(`  - ${e}`));
  console.error('\n⛔ You MUST fix these issues and include complete raw context before proceeding to commit or deploy!\n');
  process.exit(1);
}

console.log(`\n✅ [QS QUALITY GATE PASSED] ${path.basename(filePath)} (${stat.size} bytes) adheres to all Iron Rules.\n`);
process.exit(0);
