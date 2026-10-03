#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Turbo Save Pipeline Orchestrator (scripts/fast-save.js)
// Unified Single-Process Auto-Save, Quality Gate, Cache-Bust & VPS Deploy
// Target Execution Time: ≤10 Seconds | Version: 3.6.1 (Self-Healing Devil-Speed)
// ═══════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function findRepoRoot(startDir) {
  let curr = startDir;
  while (curr && curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, '.git'))) return curr;
    curr = path.dirname(curr);
  }
  return path.resolve(startDir, '../../..');
}
const ROOT = findRepoRoot(__dirname);

// ─── Telemetry Stopwatch ───────────────────────────────────────────────────────
const timings = {};
function recordTime(phase, durationMs) {
  timings[phase] = durationMs;
}

// ─── SemVer Natural Parser & Sorter (Armor 1) ─────────────────────────────────
export function parseSemVer(filename) {
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

// ─── CLI Arguments Parsing ────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
let startTimestamp = null;
const startIdx = rawArgs.indexOf('--start');
if (startIdx !== -1 && rawArgs[startIdx + 1]) {
  const rawStart = rawArgs[startIdx + 1].trim();
  const parsed = !isNaN(Number(rawStart)) ? Number(rawStart) : Date.parse(rawStart);
  if (!isNaN(parsed)) {
    startTimestamp = parsed;
  }
}

const flags = {
  dryRun: rawArgs.includes('--dry-run'),
  skipVerify: rawArgs.includes('--skip-verify'),
  skipCacheBust: rawArgs.includes('--skip-cache-bust'),
  skipCompile: rawArgs.includes('--skip-compile'),
  skipPush: rawArgs.includes('--skip-push'),
  skipCleanup: rawArgs.includes('--skip-cleanup'),
  help: rawArgs.includes('--help') || rawArgs.includes('-h')
};

if (flags.help) {
  console.log(`
Usage: node scripts/fast-save.js [options] [target_quick_save_path] [commit_message]

Options:
  --start <time>     User prompt timestamp (ISO or ms) for True Wall-Clock calculation
  --dry-run          Run validation, indexer and check cache-bust without committing/pushing
  --skip-compile     Skip qs-compiler.js artifact & diff auto-assembly
  --skip-verify      Skip verify-qs.js quality gate (use only in emergency)
  --skip-cache-bust  Skip bump-cache.js even if public/ files changed
  --skip-push        Skip git push to remote VPS (preserve local commit only)
  --skip-cleanup     Skip SemVer 5-7 root file auto-archiving
  -h, --help         Show this help message
`);
  process.exit(0);
}

const positionalArgs = rawArgs.filter((arg, i) => !arg.startsWith('--') && (i === 0 || rawArgs[i - 1] !== '--start'));
let targetQuickSave = positionalArgs[0] || null;
let commitMessage = positionalArgs[1] || null;

console.log('═══════════════════════════════════════════════════════════');
console.log('  ⚡ Turbo Save Pipeline V3.6 (Devil-Speed Architecture)');
console.log('═══════════════════════════════════════════════════════════');

const pipelineStart = Date.now();

// ─── Step 0: Check Git Lock ───────────────────────────────────────────────────
const gitLockFile = path.join(ROOT, '.git', 'index.lock');
if (fs.existsSync(gitLockFile)) {
  console.error('\n❌ [GIT LOCK ERROR] Another git process is running (.git/index.lock exists).');
  console.error('   Please wait or delete .git/index.lock if stale before running /save.\n');
  process.exit(1);
}

// ─── Auto-Detect Target Quick Save if not supplied (Dynamic Scanner V3.6) ─────
if (!targetQuickSave) {
  console.log('[Auto-Detect] No target Quick Save path provided. Scanning all Complete/* subdirectories...');
  const searchDirs = [path.join(ROOT, 'Quick Save', 'Active')];

  // Dynamically discover ALL subdirectories under Quick Save/Complete/
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
    targetQuickSave = path.relative(ROOT, newestFile);
    console.log(`[Auto-Detect] Found newest Quick Save file: ${targetQuickSave}`);
  }
}

// ─── Resolve Script (Self-Contained Skill -> Local -> Hub Fallbacks) ──────────
function resolveScript(scriptName) {
  const candidates = [
    path.join(__dirname, scriptName),
    path.join(ROOT, '.agents', 'skills', 'save', 'scripts', scriptName),
    path.join(ROOT, 'scripts', scriptName),
    path.join('C:\\XBrain', 'scripts', scriptName),
    path.join('C:\\XBrain', '.agents', 'skills', 'save', 'scripts', scriptName)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ─── Armor 1: Auto-Relocate Completed Plan (Active ➔ Complete) ────────────────
let targetComponent = 'Core-VPS';
if (targetQuickSave) {
  const fullTarget = path.resolve(ROOT, targetQuickSave);
  if (fs.existsSync(fullTarget)) {
    try {
      const content = fs.readFileSync(fullTarget, 'utf8');
      const isComplete = /^status:\s*complete/m.test(content) || /^outcome:\s*shipped/m.test(content);
      const normRel = path.relative(ROOT, fullTarget).replace(/\\/g, '/');

      // Detect component
      const subParts = normRel.split('/');
      if (subParts.length > 3 && (subParts[1] === 'Active' || subParts[1] === 'Complete')) {
        targetComponent = subParts[2];
      } else {
        const compMatch = content.match(/^component:\s*["']?([^"'\r\n]+)/m);
        if (compMatch && compMatch[1].trim()) targetComponent = compMatch[1].trim();
      }

      if (isComplete && normRel.startsWith('Quick Save/Active/')) {
        console.log(`\n📦 [Auto-Relocate] Completed plan detected in Active directory.`);
        const destDir = path.join(ROOT, 'Quick Save', 'Complete', targetComponent);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const destFile = path.join(destDir, path.basename(fullTarget));
        fs.renameSync(fullTarget, destFile);
        targetQuickSave = path.relative(ROOT, destFile);
        console.log(`  ✔ Relocated: ${normRel} ➔ ${path.relative(ROOT, destFile)}`);
      }
    } catch (e) {
      console.warn(`⚠️ [Auto-Relocate Warning] ${e.message}`);
    }
  }
}

// ─── Step 0.5: QS Auto-Compiler Engine (Assembly in ~50ms) ───────────────────
const step05Start = Date.now();
if (flags.skipCompile) {
  console.log('\n[0.5/7] QS Auto-Compiler: ⚠️ SKIPPED by flag');
  recordTime('QS Compiler', 0);
} else if (targetQuickSave) {
  const compilerScript = resolveScript('qs-compiler.js');
  if (compilerScript) {
    console.log(`\n[0.5/7] QS Auto-Compiler: Assembling artifacts & diff for ${path.basename(targetQuickSave)}...`);
    try {
      execSync(`node "${compilerScript}" "${targetQuickSave}"`, { cwd: ROOT, stdio: 'inherit' });
      recordTime('QS Compiler', Date.now() - step05Start);
    } catch (err) {
      console.warn(`⚠️ [QS Compiler Warning] Compiler error (${err.message}). Continuing...`);
      recordTime('QS Compiler', Date.now() - step05Start);
    }
  } else {
    recordTime('QS Compiler', 0);
  }
} else {
  recordTime('QS Compiler', 0);
}

// ─── Step 1: Preflight Quality Gate (verify-qs) ───────────────────────────────
const step1Start = Date.now();
if (flags.skipVerify) {
  console.log('\n[1/7] Quality Gate (verify-qs): ⚠️ SKIPPED by flag');
  recordTime('Quality Gate', 0);
} else if (targetQuickSave) {
  const fullQsPath = path.resolve(ROOT, targetQuickSave);
  if (!fs.existsSync(fullQsPath)) {
    console.error(`\n❌ [ERROR] Target Quick Save file does not exist: ${fullQsPath}`);
    process.exit(1);
  }

  console.log(`\n[1/7] Quality Gate: Verifying ${path.basename(fullQsPath)}...`);
  const verifyScript = resolveScript('verify-qs.js');
  if (verifyScript) {
    try {
      execSync(`node "${verifyScript}" "${fullQsPath}"`, { cwd: ROOT, stdio: 'inherit' });
      recordTime('Quality Gate', Date.now() - step1Start);
    } catch (err) {
      console.error('\n🚫 [Quality Gate Failed] Fix Quick Save issues before committing!');
      process.exit(1);
    }
  } else {
    console.log('[1/7] Quality Gate: verify-qs.js not found -> skipped');
    recordTime('Quality Gate', 0);
  }
} else {
  console.log('\n[1/7] Quality Gate: Skipped (no Quick Save file provided or found)');
  recordTime('Quality Gate', 0);
}

// ─── Step 2: Universal Search Indexer (True Incremental) ──────────────────────
const step2Start = Date.now();
console.log('\n[2/7] Search Indexer: Running incremental update...');
const indexerScript = resolveScript('qs-indexer.js');
if (indexerScript) {
  try {
    const indexerArgs = targetQuickSave ? `"${targetQuickSave}"` : '';
    execSync(`node "${indexerScript}" --incremental ${indexerArgs}`, { cwd: ROOT, stdio: 'inherit' });
    recordTime('Universal Indexer', Date.now() - step2Start);
  } catch (err) {
    console.warn(`⚠️ [Indexer Warning] Incremental indexing had issues (${err.message}). Continuing...`);
    recordTime('Universal Indexer', Date.now() - step2Start);
  }
} else {
  console.log('[2/7] Search Indexer: qs-indexer.js not found -> skipped');
  recordTime('Universal Indexer', 0);
}

// ─── Step 3: Conditional Cache-Busting ─────────────────────────────────────────
const step3Start = Date.now();
let publicChanged = false;
const publicDir = path.join(ROOT, 'public');
if (fs.existsSync(publicDir)) {
  try {
    const porcelain = execSync('git status --porcelain public/', { cwd: ROOT, encoding: 'utf-8' });
    const diff = execSync('git diff --name-only HEAD -- public/', { cwd: ROOT, encoding: 'utf-8' }).trim();
    publicChanged = Boolean(porcelain.trim() || diff);
  } catch {}
}

if (flags.skipCacheBust) {
  console.log('\n[3/7] Cache Busting: ⚠️ SKIPPED by flag');
  recordTime('Cache Busting', 0);
} else if (publicChanged) {
  console.log('\n[3/7] Cache Busting: Changes detected in public/ -> running bump-cache.js...');
  const bumpScript = path.join(ROOT, 'bump-cache.js');
  if (fs.existsSync(bumpScript)) {
    try {
      execSync(`node "${bumpScript}"`, { cwd: ROOT, stdio: 'inherit' });
      recordTime('Cache Busting', Date.now() - step3Start);
    } catch (err) {
      console.error('\n🚫 [Cache Busting Failed] Aborting deploy to prevent broken assets!');
      process.exit(1);
    }
  } else {
    console.log('[3/7] Cache Busting: bump-cache.js not found, skipping');
    recordTime('Cache Busting', 0);
  }
} else {
  console.log('\n[3/7] Cache Busting: No public/ changes detected -> skipped (saved 2s)');
  recordTime('Cache Busting', 0);
}

// ─── Step 3.5: SemVer Floating Files Auto-Archive (5-7 Rule Enforcement) ─────
const step35Start = Date.now();
if (!flags.skipCleanup) {
  const targetCompDir = path.join(ROOT, 'Quick Save', 'Complete', targetComponent);
  if (fs.existsSync(targetCompDir)) {
    const entries = fs.readdirSync(targetCompDir, { withFileTypes: true });
    const floating = entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name);
    if (floating.length > 7) {
      floating.sort(compareSemVer);
      const toArchive = floating.slice(0, floating.length - 6);
      console.log(`\n[3.5/7] Auto-Archive: ${floating.length} files floating in Complete/${targetComponent} (Limit: 7). Archiving ${toArchive.length} file(s)...`);
      for (const f of toArchive) {
        const sem = parseSemVer(f);
        const folderName = sem ? `V${sem.major}` : 'V13';
        const archiveDir = path.join(targetCompDir, folderName);
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        fs.renameSync(path.join(targetCompDir, f), path.join(archiveDir, f));
        console.log(`  ✔ Archived: ${f} ➔ Complete/${targetComponent}/${folderName}/`);
      }
      recordTime('SemVer Auto-Archive', Date.now() - step35Start);
    } else {
      recordTime('SemVer Auto-Archive', 0);
    }
  } else {
    recordTime('SemVer Auto-Archive', 0);
  }
} else {
  recordTime('SemVer Auto-Archive', 0);
}

// ─── Step 3.8: Auto-Sync MASTER_ROADMAP.md ──────────────────────────────────
const step38Start = Date.now();
const roadmapPath = path.join(ROOT, 'docs', 'MASTER_ROADMAP.md');
if (fs.existsSync(roadmapPath) && targetQuickSave) {
  try {
    const qsFullPath = path.resolve(ROOT, targetQuickSave);
    const qsContent = fs.readFileSync(qsFullPath, 'utf8');
    const qsRelPath = targetQuickSave.replace(/\\/g, '/');

    // Extract metadata from frontmatter
    const versionM = qsContent.match(/^version:\s*["']?([^"'\r\n]+)/m);
    const summaryM = qsContent.match(/^summary:\s*>\s*\r?\n\s+(.+)/m);
    const titleM   = qsContent.match(/^#\s+(.+)$/m);
    const typeM    = qsContent.match(/^type:\s*["']?(\w+)/m);

    const ver = versionM ? versionM[1].trim() : null;
    const summary = summaryM ? summaryM[1].trim().slice(0, 300) : '';
    const rawTitle = titleM ? titleM[1].replace(/[🔴🟢🟡⚠️✅❌🚀🔥💡🎯📌📋🔧🛠️📦🔬🔗🏗️📊🤖💾🧠⛔🔍]/g, '').replace(/^V\d+\.\d+\.\d+\s*[—–-]\s*/,'').trim() : '';
    const qsType = typeM ? typeM[1].trim() : 'impl';

    if (ver && rawTitle) {
      let roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
      const completedHeading = /## 🔵 3\. Completed[^\r\n]*/;
      const match = roadmapContent.match(completedHeading);

      // Build clean relative file link
      const linkPath = `file:///c:/My%20Claw/${path.basename(ROOT)}/${qsRelPath}`.replace(/ /g, '%20').replace(/\[/g, '%5B').replace(/\]/g, '%5D');
      const entryLabel = `[${targetComponent}] ${rawTitle} (V${ver})`;
      const newItem = `- **${entryLabel}**: ${summary}\r\n  - 📂 **Context File**: [${path.basename(targetQuickSave)}](${linkPath})`;

      // Check if already synced (idempotent)
      if (match && !roadmapContent.includes(`V${ver}`)) {
        roadmapContent = roadmapContent.replace(completedHeading, `${match[0]}\r\n${newItem}`);
        fs.writeFileSync(roadmapPath, roadmapContent, 'utf8');
        console.log(`\n[3.8/7] Auto-Sync Roadmap: Injected V${ver} into MASTER_ROADMAP.md ✅`);
      } else {
        console.log(`\n[3.8/7] Auto-Sync Roadmap: V${ver} already present or heading not found. Skipped.`);
      }
    } else {
      console.log('\n[3.8/7] Auto-Sync Roadmap: Could not extract version/title from QS. Skipped.');
    }
  } catch (e) {
    console.warn(`⚠️ [Auto-Sync Roadmap] ${e.message}`);
  }
} else {
  console.log('\n[3.8/7] Auto-Sync Roadmap: No MASTER_ROADMAP.md found or no QS target. Skipped.');
}
recordTime('Roadmap Sync', Date.now() - step38Start);

// ─── Step 4: Single Atomic Git Commit ─────────────────────────────────────────
const step4Start = Date.now();
console.log('\n[4/7] Git Staging & Commit...');

// Determine commit message
if (!commitMessage) {
  if (targetQuickSave && fs.existsSync(path.resolve(ROOT, targetQuickSave))) {
    const qsContent = fs.readFileSync(path.resolve(ROOT, targetQuickSave), 'utf-8');
    const versionMatch = qsContent.match(/version:\s*["']?([^"'\r\n]+)/);
    const titleMatch = qsContent.match(/^#\s+(.+)$/m);
    const ver = versionMatch ? versionMatch[1].trim() : 'Auto';
    const title = titleMatch ? titleMatch[1].replace(/[🔴🟢🟡⚠️✅❌🚀🔥💡🎯📌📋🔧🛠️📦🔬🔗🏗️📊🤖💾🧠⛔🔍]/g, '').trim() : '';
    commitMessage = `[AG] Auto-Save & Deploy V${ver}${title ? ': ' + title : ''}`;
  } else {
    commitMessage = `[AG] Auto-Save & Deploy ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
  }
}

try {
  execSync('git add .', { cwd: ROOT, stdio: 'pipe' });
  const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' }).trim();
  if (status) {
    if (flags.dryRun) {
      console.log(`[Dry-Run] Would commit with message: "${commitMessage}"`);
    } else {
      const commitRes = spawnSync('git', ['commit', '-m', commitMessage], { cwd: ROOT, stdio: 'inherit' });
      if (commitRes.status !== 0) {
        throw new Error(`git commit failed with exit code ${commitRes.status}`);
      }
      console.log(`✅ Committed: "${commitMessage}"`);
    }
  } else {
    console.log('ℹ️ Working tree already clean. Nothing new to commit.');
  }
  recordTime('Atomic Commit', Date.now() - step4Start);
} catch (err) {
  console.error(`\n❌ [Git Commit Error] ${err.message}`);
  process.exit(1);
}

// ─── Step 5: Production Deploy (Smart Multi-Remote Push with Fail Guard) ───────
const step5Start = Date.now();
console.log('\n[5/7] Production Deployment...');

// Detect active branch
let currentBranch = 'master';
try {
  currentBranch = execSync('git branch --show-current', { cwd: ROOT, encoding: 'utf-8' }).trim() || 'master';
} catch {}

// Select target remotes: vps priority (single remote target to avoid double pushes)
let targetRemotes = ['vps'];
try {
  const remoteOut = execSync('git remote', { cwd: ROOT, encoding: 'utf-8' }).trim();
  const availableRemotes = remoteOut.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
  if (availableRemotes.includes('vps')) {
    targetRemotes = ['vps'];
  } else if (availableRemotes.includes('origin')) {
    targetRemotes = ['origin'];
  } else if (availableRemotes.length > 0) {
    targetRemotes = [availableRemotes[0]];
  } else {
    targetRemotes = [];
  }
} catch {}

if (flags.dryRun) {
  console.log(`🔍 [Dry-Run] Skipping push to ${targetRemotes.join(', ')} (${currentBranch})`);
  recordTime('Production Push', 0);
} else if (flags.skipPush) {
  console.log('ℹ️ Push skipped by --skip-push flag. Local commit preserved.');
  recordTime('Production Push', 0);
} else if (targetRemotes.length === 0) {
  console.log('ℹ️ No git remotes configured for this workspace. Skipping push.');
  recordTime('Production Push', 0);
} else {
  let anySuccess = false;
  let pushErrors = [];
  for (const remote of targetRemotes) {
    try {
      console.log(`🚀 Pushing to ${remote} (git push ${remote} ${currentBranch})...`);
      execSync(`git push ${remote} ${currentBranch}`, { cwd: ROOT, stdio: 'inherit' });
      console.log(`✅ Push to ${remote} (${currentBranch}) succeeded.`);
      anySuccess = true;
    } catch (err) {
      console.error(`⚠️ Push to ${remote} failed: ${err.message}`);
      pushErrors.push(`${remote}: ${err.message}`);
    }
  }
  recordTime('Production Push', Date.now() - step5Start);
  if (!anySuccess) {
    console.error('\n🚨 [CRITICAL DEPLOY FAILURE] All configured git pushes failed!');
    console.error(`   Errors: ${pushErrors.join(' | ')}`);
    console.error('   Local commit was saved, but REMOTE VPS IS NOT UPDATED!');
    console.error('   Check network/credentials or use --skip-push if offline.\n');
    process.exit(1);
  }
}

// ─── Step 6: Detached Background Log Sync ─────────────────────────────────────
const step6Start = Date.now();
console.log('\n[6/7] Background Log Sync...');
const logSyncScript = resolveScript('sync-ag-logs.js');
if (logSyncScript && !flags.dryRun) {
  try {
    const child = spawn(process.execPath, [logSyncScript], {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    console.log('⚡ [sync-ag-logs] Spawned in background detached mode (0ms).');
    recordTime('Log Sync', Date.now() - step6Start);
  } catch (err) {
    console.warn(`⚠️ [sync-ag-logs] Spawn failed: ${err.message}`);
    recordTime('Log Sync', 0);
  }
} else {
  recordTime('Log Sync', 0);
}

// ─── Telemetry Summary ────────────────────────────────────────────────────────
const engineElapsedSec = ((Date.now() - pipelineStart) / 1000).toFixed(2);
const trueWallClockSec = startTimestamp ? ((Date.now() - startTimestamp) / 1000).toFixed(2) : null;

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  🎉 Turbo Save Pipeline Finished Successfully!');
console.log('───────────────────────────────────────────────────────────');
for (const [phase, ms] of Object.entries(timings)) {
  const display = ms > 0 ? `${(ms / 1000).toFixed(2)}s (${ms}ms)` : 'skipped / 0ms';
  console.log(`  • ${phase.padEnd(25)}: ${display}`);
}
console.log('───────────────────────────────────────────────────────────');
console.log(`  ⚡ Engine Pipeline Elapsed : ${engineElapsedSec}s (Target: ≤ 20s) ${engineElapsedSec <= 20 ? '🟢 PASSED' : '🟡 REVIEW'}`);
if (trueWallClockSec) {
  console.log(`  ⏱️  True Wall-Clock Elapsed : ${trueWallClockSec}s (User Prompt ➔ Complete)`);
}
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(0);
