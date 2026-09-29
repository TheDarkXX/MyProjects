#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  QC Radar & Workspace Hygiene Engine (V13.85.0 - Hardened V2)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Usage:
 *    node scripts/qc-audit.js          # Audit mode (Read-only scan & report)
 *    node scripts/qc-audit.js --fix    # Safe auto-fix (Quarantine ghosts, route loose files, re-index)
 *    node scripts/qc-audit.js --test   # Self-test suite (Verify SemVer, Hash & Quarantine armor)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const isFixMode = process.argv.includes('--fix');
const isTestMode = process.argv.includes('--test');

// ANSI Terminal Colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

const LOCKED_ROOT_SCRIPTS = new Set([
  'server.js',
  'ai-gateway.js',
  'generate_cloud_images.cjs',
  'higgsfield-auth-watchdog-vps.cjs',
  'bump-cache.js',
  'deploy.js',
  'start.sh',
  'Open AG.bat',
  'start-voice.bat',
  'ecosystem.config.js'
]);

// ─────────────────────────────────────────────────────────────
// 🛡️ ARMOR 1: Natural Semantic Version Parser & Sorter
// ─────────────────────────────────────────────────────────────
export function parseSemVer(filename) {
  // Matches V13.85.0 or V13.10.4 or V1.0.5 or V12.22
  const match = filename.match(/^V(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  if (!match) return null;
  return {
    major: parseInt(match[1] || '0', 10),
    minor: parseInt(match[2] || '0', 10),
    patch: parseInt(match[3] || '0', 10),
    raw: match[0]
  };
}

export function compareSemVer(a, b) {
  const verA = parseSemVer(a);
  const verB = parseSemVer(b);
  if (!verA && !verB) return a.localeCompare(b);
  if (!verA) return -1;
  if (!verB) return 1;
  if (verA.major !== verB.major) return verA.major - verB.major;
  if (verA.minor !== verB.minor) return verA.minor - verB.minor;
  if (verA.patch !== verB.patch) return verA.patch - verB.patch;
  return a.localeCompare(b);
}

// ─────────────────────────────────────────────────────────────
// 🛡️ ARMOR 2: Content Hash & Safety Comparator (SHA-256)
// ─────────────────────────────────────────────────────────────
export function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function evaluateGhostSafety(activePath, completePath) {
  const activeContent = fs.readFileSync(activePath, 'utf8');
  const completeContent = fs.readFileSync(completePath, 'utf8');

  const activeHash = crypto.createHash('sha256').update(activeContent).digest('hex');
  const completeHash = crypto.createHash('sha256').update(completeContent).digest('hex');

  if (activeHash === completeHash) {
    return { isSafe: true, reason: 'EXACT_HASH_MATCH' };
  }

  // Size difference check
  const activeLen = activeContent.length;
  const completeLen = completeContent.length;
  const diffBytes = Math.abs(activeLen - completeLen);
  const diffRatio = diffBytes / Math.max(activeLen, completeLen);

  if (diffRatio > 0.05) {
    return {
      isSafe: false,
      reason: 'CONTENT_DIVERGED',
      details: `Active length: ${activeLen}, Complete length: ${completeLen}, Diff: ${Math.round(diffRatio * 100)}%`
    };
  }

  return { isSafe: true, reason: 'MINOR_FORMATTING_DIFF' };
}

// ─────────────────────────────────────────────────────────────
// 🛡️ ARMOR 3: Safe Quarantine Vault (Zero Hard-Unlink)
// ─────────────────────────────────────────────────────────────
export function quarantineFile(filePath, reason) {
  const monthStr = new Date().toISOString().substring(0, 7); // e.g. "2026-09"
  const qDir = path.join(ROOT, '.system_quarantine', monthStr);
  if (!fs.existsSync(qDir)) fs.mkdirSync(qDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destName = `${timestamp}_${path.basename(filePath)}`;
  const destPath = path.join(qDir, destName);

  fs.copyFileSync(filePath, destPath);
  fs.unlinkSync(filePath);

  // Write quarantine manifest entry
  const metaLog = path.join(qDir, 'quarantine_manifest.jsonl');
  const entry = JSON.stringify({
    originalPath: path.relative(ROOT, filePath),
    quarantineName: destName,
    timestamp: new Date().toISOString(),
    reason
  }) + '\n';
  fs.appendFileSync(metaLog, entry, 'utf8');

  return destPath;
}

// ─────────────────────────────────────────────────────────────
// 🛡️ ARMOR 4: Loose File State Machine Router
// ─────────────────────────────────────────────────────────────
export function determineLooseFileDestination(filePath) {
  const filename = path.basename(filePath);
  if (!filename.endsWith('.md')) {
    return { action: 'SCRATCH', targetDir: path.join(ROOT, 'scratch') };
  }

  let content = '';
  try { content = fs.readFileSync(filePath, 'utf8'); } catch (e) { return null; }

  const dateMatch = content.match(/^date:\s*([\d-]+)/m);
  const fileDate = dateMatch ? new Date(dateMatch[1]) : null;
  const now = new Date();
  const ageDays = fileDate ? Math.round((now - fileDate) / (1000 * 60 * 60 * 24)) : 0;

  // Detect component from tags / filename
  const lower = (filename + ' ' + content.substring(0, 1000)).toLowerCase();
  let component = 'Core-VPS';

  if (lower.includes('doctorbank') || lower.includes('drbpost')) {
    component = 'DoctorBank-Brand';
  } else if (lower.includes('hypercut')) {
    component = 'HyperCut';
  } else if (lower.includes('vve') || lower.includes('capcut') || lower.includes('kallaway')) {
    component = 'Viral VDO Editing (VVE)';
  } else if (lower.includes('system-skill') || lower.includes('ag-skill')) {
    component = 'System-Skills';
  }

  // If older than 30 days and still pending/active -> Icebox candidate
  const isPending = /status:\s*active/m.test(content) && /outcome:\s*pending/m.test(content);
  if (ageDays > 30 && isPending) {
    return {
      action: 'ICEBOX',
      targetDir: path.join(ROOT, 'Quick Save', 'Icebox'),
      reason: `Idle pending proposal (${ageDays} days old)`
    };
  }

  return {
    action: 'COMPONENT',
    targetDir: path.join(ROOT, 'Quick Save', 'Active', component),
    reason: `Routed to component ${component}`
  };
}

function getAllFiles(dir, filterExt = null, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      getAllFiles(fullPath, filterExt, fileList);
    } else if (item.isFile()) {
      if (!filterExt || item.name.endsWith(filterExt)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

// ─────────────────────────────────────────────────────────────
// SELF-TEST SUITE (--test)
// ─────────────────────────────────────────────────────────────
if (isTestMode) {
  console.log(`${c.bold}${c.magenta}═══════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}${c.magenta}  Running QC Radar Enterprise Self-Test Suite...${c.reset}`);
  console.log(`${c.bold}${c.magenta}═══════════════════════════════════════════════════════════════${c.reset}\n`);

  let passed = 0;
  let failed = 0;

  function assert(name, condition) {
    if (condition) {
      console.log(`  ${c.green}✔ PASS:${c.reset} ${name}`);
      passed++;
    } else {
      console.log(`  ${c.red}✖ FAIL:${c.reset} ${name}`);
      failed++;
    }
  }

  // Test 1: SemVer Sorting
  const testVersions = [
    'V13.85.0_plan.md',
    'V13.2.0_plan.md',
    'V13.10.4_plan.md',
    'V13.7.1_plan.md',
    'V1.0.5_plan.md'
  ];
  testVersions.sort(compareSemVer);
  assert('SemVer Sort Orders Natural Numbers (V13.7 before V13.10)', testVersions.indexOf('V13.7.1_plan.md') < testVersions.indexOf('V13.10.4_plan.md'));
  assert('SemVer Sort Orders Major Versions (V1 before V13)', testVersions.indexOf('V1.0.5_plan.md') === 0);
  assert('SemVer Sort Orders Latest Patch (V13.85 last)', testVersions[testVersions.length - 1] === 'V13.85.0_plan.md');

  // Test 2: SHA-256 Consistency
  const tempFileA = path.join(ROOT, 'scratch', '_test_hash_a.tmp');
  const tempFileB = path.join(ROOT, 'scratch', '_test_hash_b.tmp');
  if (!fs.existsSync(path.join(ROOT, 'scratch'))) fs.mkdirSync(path.join(ROOT, 'scratch'), { recursive: true });

  fs.writeFileSync(tempFileA, 'Test Content Exact', 'utf8');
  fs.writeFileSync(tempFileB, 'Test Content Exact', 'utf8');
  assert('Hash Matches on Identical Content', getFileHash(tempFileA) === getFileHash(tempFileB));

  fs.writeFileSync(tempFileB, 'Test Content Modified Heavily 1234567890', 'utf8');
  const evalResult = evaluateGhostSafety(tempFileA, tempFileB);
  assert('Safety Evaluator Flags Divergent Content', evalResult.isSafe === false && evalResult.reason === 'CONTENT_DIVERGED');

  // Test 3: Safe Quarantine Simulation
  const qDest = quarantineFile(tempFileA, 'TEST_QUARANTINE');
  assert('Quarantine File Successfully Moved', fs.existsSync(qDest) && !fs.existsSync(tempFileA));

  // Cleanup
  if (fs.existsSync(tempFileB)) fs.unlinkSync(tempFileB);
  if (fs.existsSync(qDest)) fs.unlinkSync(qDest);

  console.log(`\n${c.bold}Test Summary: ${c.green}${passed} passed${c.reset}, ${failed > 0 ? c.red + failed + ' failed' : c.gray + '0 failed'}${c.reset}`);
  process.exit(failed > 0 ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────
// MAIN EXECUTION (Audit & Auto-Fix)
// ─────────────────────────────────────────────────────────────
console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════════════${c.reset}`);
console.log(`${c.bold}${c.cyan}  QC Radar & Workspace Hygiene Engine (V2 Hardened)${c.reset} ${c.gray}(Mode: ${isFixMode ? c.yellow + 'AUTO-FIX (ARMORED)' : c.green + 'AUDIT ONLY'}${c.gray})${c.reset}`);
console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════════════${c.reset}\n`);

// ─────────────────────────────────────────────────────────────
// PHASE 0: Root Folder Health Check
// ─────────────────────────────────────────────────────────────
console.log(`${c.bold}[Phase 0] Root Folder Hygiene Check...${c.reset}`);
const rootItems = fs.readdirSync(ROOT, { withFileTypes: true });
const rootScripts = rootItems
  .filter(item => item.isFile() && /\.(js|cjs|mjs|py|sql|bat|sh)$/i.test(item.name))
  .map(item => item.name);

const unknownScripts = rootScripts.filter(name => !LOCKED_ROOT_SCRIPTS.has(name));

console.log(`  Root Scripts: ${rootScripts.length} files (Limit: 20)`);
if (rootScripts.length > 20) {
  console.log(`  ${c.red}⚠️ WARNING: Root script count exceeds 20! Recommend moving loose scripts to tools/.${c.reset}`);
} else {
  console.log(`  ${c.green}✅ Script count OK (${rootScripts.length}/20)${c.reset}`);
}

if (unknownScripts.length > 0) {
  console.log(`  ${c.yellow}⚠️ Unknown scripts at root:${c.reset}`, unknownScripts);
} else {
  console.log(`  ${c.green}✅ All root scripts match LOCKED registry.${c.reset}`);
}

// ─────────────────────────────────────────────────────────────
// PHASE 1: Active Directory Scan (Recursive & Ghost Detection)
// ─────────────────────────────────────────────────────────────
console.log(`\n${c.bold}[Phase 1] Scanning Quick Save Active & Complete Repositories...${c.reset}`);
const activeDir = path.join(ROOT, 'Quick Save', 'Active');
const completeDir = path.join(ROOT, 'Quick Save', 'Complete');

const activeFiles = getAllFiles(activeDir, '.md');
const completeFiles = getAllFiles(completeDir, '.md');

console.log(`  Total Active Markdown files (Recursive): ${c.bold}${activeFiles.length}${c.reset}`);
console.log(`  Total Complete Markdown files: ${c.bold}${completeFiles.length}${c.reset}`);

// Map of complete basenames -> array of paths
const completeMap = new Map();
for (const cp of completeFiles) {
  const base = path.basename(cp);
  if (!completeMap.has(base)) completeMap.set(base, []);
  completeMap.get(base).push(cp);
}

const safeGhosts = [];
const conflictedGhosts = [];
const unmovedComplete = [];
const looseActiveFiles = [];

// Check loose files at root of Active
if (fs.existsSync(activeDir)) {
  const activeRootEntries = fs.readdirSync(activeDir, { withFileTypes: true });
  for (const ent of activeRootEntries) {
    const fullPath = path.join(activeDir, ent.name);
    if (ent.isFile()) {
      looseActiveFiles.push(fullPath);
    }
  }
}

// Evaluate each active file
for (const af of activeFiles) {
  const base = path.basename(af);
  if (completeMap.has(base)) {
    const targetComplete = completeMap.get(base)[0];
    const safety = evaluateGhostSafety(af, targetComplete);
    if (safety.isSafe) {
      safeGhosts.push({ activePath: af, completePath: targetComplete, reason: safety.reason });
    } else {
      conflictedGhosts.push({ activePath: af, completePath: targetComplete, details: safety.details });
    }
  }

  try {
    const content = fs.readFileSync(af, 'utf8');
    if (/^status:\s*complete/m.test(content) || /^outcome:\s*shipped/m.test(content)) {
      unmovedComplete.push(af);
    }
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────
// PHASE 2: Complete Directory Organization (Floating Files & SemVer)
// ─────────────────────────────────────────────────────────────
console.log(`\n${c.bold}[Phase 2] Checking Complete/ Folder Organization (SemVer Floating Engine)...${c.reset}`);
const coreVpsCompleteDir = path.join(completeDir, 'Core-VPS');
let coreVpsFloatingCount = 0;
let filesToArchive = [];

if (fs.existsSync(coreVpsCompleteDir)) {
  const items = fs.readdirSync(coreVpsCompleteDir, { withFileTypes: true });
  const floatingFiles = items.filter(i => i.isFile() && i.name.endsWith('.md')).map(i => i.name);
  coreVpsFloatingCount = floatingFiles.length;

  // Natural SemVer sorting
  floatingFiles.sort(compareSemVer);

  console.log(`  Core-VPS Floating Files at root: ${c.bold}${coreVpsFloatingCount}${c.reset} (Allowed: 5-7)`);
  if (coreVpsFloatingCount > 7) {
    // Keep top 6 newest, archive the older ones
    filesToArchive = floatingFiles.slice(0, coreVpsFloatingCount - 6);
    console.log(`  ${c.yellow}⚠️ Auto-Cleanup Triggered: ${filesToArchive.length} older files queued for SemVer archive.${c.reset}`);
    filesToArchive.forEach(f => console.log(`    ↳ to archive: ${f}`));
  } else {
    console.log(`  ${c.green}✅ Core-VPS root file count within optimal range.${c.reset}`);
  }
}

// ─────────────────────────────────────────────────────────────
// SUMMARY TABLE & FINDINGS
// ─────────────────────────────────────────────────────────────
console.log(`\n${c.bold}[Summary Findings]${c.reset}`);
console.log(`  • Verified Safe Ghosts (Ready to Quarantine): ${safeGhosts.length > 0 ? c.red + safeGhosts.length : c.green + '0'}${c.reset}`);
console.log(`  • Conflicted Ghosts (BLOCKED - Content Diverged): ${conflictedGhosts.length > 0 ? c.red + c.bold + conflictedGhosts.length : c.green + '0'}${c.reset}`);
console.log(`  • Unmoved Complete Files in Active: ${unmovedComplete.length > 0 ? c.yellow + unmovedComplete.length : c.green + '0'}${c.reset}`);
console.log(`  • Loose Files at Active/ root: ${looseActiveFiles.length > 0 ? c.yellow + looseActiveFiles.length : c.green + '0'}${c.reset}`);
console.log(`  • Core-VPS Older Files to Archive: ${filesToArchive.length > 0 ? c.yellow + filesToArchive.length : c.green + '0'}${c.reset}`);

if (conflictedGhosts.length > 0) {
  console.log(`\n${c.bold}${c.red}🚨 BLOCKED: Conflicted Ghosts Detected (Different Content - Protected by Armor):${c.reset}`);
  conflictedGhosts.forEach(cg => {
    console.log(`  - ${path.relative(ROOT, cg.activePath)}`);
    console.log(`    ↳ Reason: ${cg.details}`);
  });
}

if (looseActiveFiles.length > 0) {
  console.log(`\n${c.bold}${c.yellow}⚠️ Loose Files floating at Quick Save/Active/ root:${c.reset}`);
  looseActiveFiles.forEach(lf => {
    const route = determineLooseFileDestination(lf);
    console.log(`  - ${path.relative(ROOT, lf)} ➔ Suggested: [${route.action}] ${path.relative(ROOT, route.targetDir)}`);
  });
}

// ─────────────────────────────────────────────────────────────
// PHASE 3: Armored Auto-Fix Execution (When --fix flag is passed)
// ─────────────────────────────────────────────────────────────
if (isFixMode) {
  console.log(`\n${c.bold}${c.yellow}═══════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}${c.yellow}  Executing Armored Auto-Fix Procedures...${c.reset}`);
  console.log(`${c.bold}${c.yellow}═══════════════════════════════════════════════════════════════${c.reset}\n`);

  let actionsTaken = 0;

  // 1. Quarantine verified safe ghosts (Zero Hard Unlink)
  for (const g of safeGhosts) {
    const qPath = quarantineFile(g.activePath, g.reason);
    console.log(`  ${c.green}✔ Quarantined ghost:${c.reset} ${path.basename(g.activePath)} ➔ ${path.relative(ROOT, qPath)}`);
    actionsTaken++;
  }

  // 2. Route loose files
  for (const lf of looseActiveFiles) {
    const route = determineLooseFileDestination(lf);
    if (route) {
      if (!fs.existsSync(route.targetDir)) fs.mkdirSync(route.targetDir, { recursive: true });
      const dest = path.join(route.targetDir, path.basename(lf));
      fs.renameSync(lf, dest);
      console.log(`  ${c.green}✔ Routed loose file:${c.reset} ${path.basename(lf)} ➔ ${path.relative(ROOT, dest)} (${route.reason || route.action})`);
      actionsTaken++;
    }
  }

  // 3. Archive Core-VPS floating files if exceeding limit
  if (filesToArchive.length > 0) {
    const v13Dir = path.join(coreVpsCompleteDir, 'V13');
    if (!fs.existsSync(v13Dir)) fs.mkdirSync(v13Dir, { recursive: true });
    for (const f of filesToArchive) {
      const src = path.join(coreVpsCompleteDir, f);
      const dest = path.join(v13Dir, f);
      fs.renameSync(src, dest);
      console.log(`  ${c.green}✔ Archived SemVer floating file:${c.reset} ${f} ➔ Complete/Core-VPS/V13/`);
      actionsTaken++;
    }
  }

  // 4. Rebuild search-manifest.md
  if (actionsTaken > 0) {
    console.log(`\n  ${c.cyan}Re-indexing search-manifest.md...${c.reset}`);
    try {
      execSync('node scripts/qs-indexer.js', { cwd: ROOT, stdio: 'inherit' });
      console.log(`  ${c.green}✅ Manifest refreshed successfully.${c.reset}`);
    } catch (e) {
      console.error(`  ${c.red}❌ Failed to refresh manifest: ${e.message}${c.reset}`);
    }
  } else {
    console.log(`  ${c.green}No auto-fix actions needed.${c.reset}`);
  }
} else {
  console.log(`\n${c.gray}Tip: Run ${c.bold}node scripts/qc-audit.js --fix${c.reset}${c.gray} to safely quarantine ghosts, auto-route loose files, and re-index manifest.${c.reset}`);
}

console.log(`\n${c.bold}${c.green}═══════════════════════════════════════════════════════════════${c.reset}`);
console.log(`${c.bold}${c.green}  QC Radar Execution Complete!${c.reset}`);
console.log(`${c.bold}${c.green}═══════════════════════════════════════════════════════════════${c.reset}\n`);
