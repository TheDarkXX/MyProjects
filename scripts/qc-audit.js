#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  QC Radar & Workspace Hygiene Engine (V3.1.0 - Active Reality Radar + Safe Auto-Promote)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Usage:
 *    node scripts/qc-audit.js          # Audit mode (Read-only scan & report)
 *    node scripts/qc-audit.js --fix    # Safe auto-fix (Quarantine ghosts, route loose files, re-index)
 *    node scripts/qc-audit.js --test   # Self-test suite (Verify SemVer, Hash, Quarantine & Active Reality)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const isFixMode = process.argv.includes('--fix') || process.argv.includes('--promote');
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
  'ecosystem.config.js',
  'ecosystem.config.cjs'
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

// ─────────────────────────────────────────────────────────────
// Frontmatter & Plan-Text Helpers (shared by ARMOR 5 + 6)
// ─────────────────────────────────────────────────────────────
export function splitFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!m) return { hasFm: false, fm: '', body: content };
  return { hasFm: true, fm: m[1], body: content.slice(m[0].length) };
}

// Remove text that is NOT the live plan: fenced code, <details> dumps, and the RAW ARTIFACT BACKUP tail.
// Prevents pasted YAML/old task lists from faking "complete" or "all ticked".
export function stripNonPlanText(body) {
  return body
    .replace(/^##\s*\S*\s*RAW ARTIFACT BACKUP[\s\S]*$/mi, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/<details>[\s\S]*?<\/details>/gi, '');
}

const CHECKBOX_RE = /^\s*(?:[-*+]|\d+\.)\s+\[([ xX])\]/gm;

// ─────────────────────────────────────────────────────────────
// 🛡️ ARMOR 5: Active Reality Radar (ตรวจสอบงานค้างจริง vs ค้างหลอก)
// ─────────────────────────────────────────────────────────────
export function evaluateActiveReality(filePath) {
  let content = '';
  try { content = fs.readFileSync(filePath, 'utf8'); } catch (e) { return null; }

  const { fm, body } = splitFrontmatter(content);
  const planText = stripNonPlanText(body);

  const boxes = [...planText.matchAll(CHECKBOX_RE)];
  const totalTasks = boxes.length;
  const doneTasks = boxes.filter(b => b[1] !== ' ').length;
  const pendingTasks = totalTasks - doneTasks;

  const dateMatch = fm.match(/^date:\s*["']?([\d-]+)/m);
  const fileDate = dateMatch ? new Date(dateMatch[1]) : null;
  const now = new Date();
  const ageDays = fileDate && !isNaN(fileDate) ? Math.round((now - fileDate) / (1000 * 60 * 60 * 24)) : 0;

  // Status is read from YAML frontmatter ONLY (never from body/code samples)
  const isStatusComplete = /^status:\s*["']?complete/im.test(fm) || /^outcome:\s*["']?shipped/im.test(fm);
  const isExplicitComplete = /COMPLETED\s*&\s*DEPLOYED/i.test(planText) ||
                             /\bStatus\b[*_:\s]*(COMPLETED|SHIPPED|DONE)\b/.test(planText) ||
                             (/##\s*สิ่งที่ทำเสร็จแล้ว/i.test(planText) && pendingTasks === 0);

  const typeMatch = fm.match(/^type:\s*(\w+)/m);
  const docType = typeMatch ? typeMatch[1].toLowerCase() : 'impl';

  // 1. ตรวจพบว่าเสร็จสมบูรณ์แล้วแน่นอน (แต่ค้างใน Active)
  if (isStatusComplete) {
    return {
      category: 'UNMOVED_COMPLETE',
      statusText: 'สถานะเป็น Complete/Shipped แล้ว แต่ยังไม่ย้ายโฟลเดอร์',
      totalTasks, doneTasks, pendingTasks, ageDays, docType
    };
  }

  if (totalTasks > 0 && pendingTasks === 0) {
    return {
      category: 'ALL_TASKS_DONE',
      statusText: `งานเสร็จ 100% (ติ๊กครบทุกข้อ ${doneTasks}/${totalTasks}) แต่ลืมแก้ frontmatter`,
      totalTasks, doneTasks, pendingTasks, ageDays, docType
    };
  }

  if (isExplicitComplete && pendingTasks === 0) {
    return {
      category: 'EXPLICIT_COMPLETION',
      statusText: 'มีข้อความระบุว่าเสร็จสิ้น/ชิปแล้ว แต่ยังไม่ได้อัปเดตสถานะ',
      totalTasks, doneTasks, pendingTasks, ageDays, docType
    };
  }

  // 2. งานค้างจริง (In Progress)
  if (pendingTasks > 0) {
    if (ageDays > 30) {
      return {
        category: 'STALE_ACTIVE',
        statusText: `ดองนานเกิน 30 วัน (${ageDays} วัน) เหลือค้างอีก ${pendingTasks}/${totalTasks} ข้อ`,
        totalTasks, doneTasks, pendingTasks, ageDays, docType
      };
    }
    return {
      category: 'GENUINE_ACTIVE',
      statusText: `กำลังทำอยู่จริง (${doneTasks}/${totalTasks} tasks เสร็จ, ค้าง ${pendingTasks} ข้อ)`,
      totalTasks, doneTasks, pendingTasks, ageDays, docType
    };
  }

  // 3. ไม่มี Task List (เช่น Study / Docs / Architecture)
  if (totalTasks === 0) {
    if (['study', 'docs', 'architecture', 'spike'].includes(docType)) {
      if (ageDays > 14) {
        return {
          category: 'UNTASKED_STUDY',
          statusText: `เอกสารประเภท ${docType} เก่าเกิน 14 วัน (${ageDays} วัน) ไม่มี Task ค้าง ตรวจสอบว่าศึกษาจบแล้วหรือไม่`,
          totalTasks, doneTasks, pendingTasks, ageDays, docType
        };
      }
      return {
        category: 'ACTIVE_STUDY',
        statusText: `งานศึกษา/ค้นคว้า (${docType}) กำลังดำเนินอยู่`,
        totalTasks, doneTasks, pendingTasks, ageDays, docType
      };
    }
    if (ageDays > 14) {
      return {
        category: 'STALE_NO_TASKS',
        statusText: `ไม่มี Checklist และนิ่งมา ${ageDays} วัน ควรทบทวนหรือย้ายเข้า Icebox`,
        totalTasks, doneTasks, pendingTasks, ageDays, docType
      };
    }
  }

  return {
    category: 'GENUINE_ACTIVE',
    statusText: 'แผนงานกำลังดำเนินการ',
    totalTasks, doneTasks, pendingTasks, ageDays, docType
  };
}

// ─────────────────────────────────────────────────────────────
// 🛡️ ARMOR 6: Auto-Promotion Engine (ย้ายงานเสร็จเข้า Complete อัตโนมัติ)
// ─────────────────────────────────────────────────────────────
// Rewrite status/outcome INSIDE the frontmatter block only. Body is never touched.
export function stampCompleteFrontmatter(content, filename) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const { hasFm, fm, body } = splitFrontmatter(content);
  if (!hasFm) {
    const ver = parseSemVer(filename);
    const today = new Date().toISOString().substring(0, 10);
    return [
      '---',
      `version: "${ver ? ver.raw.substring(1) : '0.0.0'}"`,
      'status: complete',
      'outcome: shipped',
      `date: ${today}`,
      'source: qc-auto-promote',
      '---',
      ''
    ].join(eol) + content;
  }
  let newFm = /^status:.*$/m.test(fm)
    ? fm.replace(/^status:.*$/m, 'status: complete')
    : `${fm}${eol}status: complete`;
  newFm = /^outcome:.*$/m.test(newFm)
    ? newFm.replace(/^outcome:.*$/m, 'outcome: shipped')
    : newFm.replace(/^status: complete$/m, `status: complete${eol}outcome: shipped`);
  return `---${eol}${newFm}${eol}---${eol}${body}`;
}

// Where a promoted plan should land. Never escapes Quick Save/Complete/<Component>/.
export function resolveCompleteTarget(filePath) {
  const activeRoot = path.join(ROOT, 'Quick Save', 'Active');
  const rel = path.relative(activeRoot, filePath);
  const parts = rel.split(path.sep);
  let component = null;
  if (!rel.startsWith('..') && !path.isAbsolute(rel) && parts.length > 1) component = parts[0];
  if (!component) {
    const loose = determineLooseFileDestination(filePath);
    component = loose && loose.action === 'COMPONENT' ? path.basename(loose.targetDir) : 'Core-VPS';
  }

  const compDir = path.join(ROOT, 'Quick Save', 'Complete', component);
  const filename = path.basename(filePath);
  const ver = parseSemVer(filename);
  let targetDir = compDir;

  // Current major floats at root; older majors go to V{n}/ or _Legacy/V{n}/
  if (ver && fs.existsSync(compDir)) {
    const floatingMajors = fs.readdirSync(compDir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => parseSemVer(e.name))
      .filter(Boolean)
      .map(v => v.major);
    const currentMajor = floatingMajors.length ? Math.max(...floatingMajors) : ver.major;
    if (ver.major < currentMajor) {
      const vMajorDir = path.join(compDir, `V${ver.major}`);
      targetDir = fs.existsSync(vMajorDir) ? vMajorDir : path.join(compDir, '_Legacy', `V${ver.major}`);
    }
  }
  return { component, targetDir, destPath: path.join(targetDir, filename) };
}

export function promotePlanToComplete(filePath) {
  const { targetDir, destPath } = resolveCompleteTarget(filePath);
  if (fs.existsSync(destPath)) {
    throw new Error(`DEST_EXISTS: ${path.relative(ROOT, destPath)} (refusing to overwrite)`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = stampCompleteFrontmatter(content, path.basename(filePath));
  fs.mkdirSync(targetDir, { recursive: true });
  // Write destination first ('wx' = fail if exists), then remove source. Source survives any write failure.
  fs.writeFileSync(destPath, updated, { encoding: 'utf8', flag: 'wx' });
  fs.unlinkSync(filePath);
  return destPath;
}

function getAllFiles(dir, filterExt = null, fileList = [], visited = new Set()) {
  if (!fs.existsSync(dir)) return fileList;
  try {
    const real = fs.realpathSync(dir);
    if (visited.has(real)) return fileList;
    visited.add(real);
  } catch (e) {
    return fileList;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    let isDir = item.isDirectory();
    if (item.isSymbolicLink()) {
      try {
        const target = fs.realpathSync(fullPath);
        if (!target.toLowerCase().startsWith(ROOT.toLowerCase())) {
          // External mesh link (e.g. DoctorBank-Brand), skip scanning into it as local files
          continue;
        }
        isDir = fs.statSync(fullPath).isDirectory();
      } catch (e) {
        continue;
      }
    }

    if (isDir) {
      getAllFiles(fullPath, filterExt, fileList, visited);
    } else if (item.isFile() || (item.isSymbolicLink() && !isDir)) {
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

  // Test 4: Active Reality Radar
  const testActiveReal = path.join(ROOT, 'scratch', '_test_active_real.md');
  const testActiveDone = path.join(ROOT, 'scratch', '_test_active_done.md');
  fs.writeFileSync(testActiveReal, '---\nversion: "1.0.0"\ntype: impl\nstatus: active\n---\n- [x] Task 1\n- [ ] Task 2\n', 'utf8');
  fs.writeFileSync(testActiveDone, '---\nversion: "1.0.0"\ntype: impl\nstatus: active\n---\n- [x] Task 1\n- [x] Task 2\n', 'utf8');

  const evalReal = evaluateActiveReality(testActiveReal);
  const evalDone = evaluateActiveReality(testActiveDone);

  assert('Reality Evaluator flags pending tasks as GENUINE_ACTIVE', evalReal.category === 'GENUINE_ACTIVE' && evalReal.pendingTasks === 1);
  assert('Reality Evaluator flags 100% checked tasks as ALL_TASKS_DONE', evalDone.category === 'ALL_TASKS_DONE' && evalDone.pendingTasks === 0);

  // Test 5: Radar immunity — pasted YAML / old ticked lists inside code blocks must NOT count
  const testTrap = path.join(ROOT, 'scratch', '_test_active_trap.md');
  fs.writeFileSync(testTrap, '---\nstatus: active\ntype: impl\n---\n- [ ] Real pending\n\n```yaml\nstatus: complete\n- [x] old artifact\n```\n', 'utf8');
  const evalTrap = evaluateActiveReality(testTrap);
  assert('Radar ignores code-block YAML and checkboxes (stays GENUINE_ACTIVE 0/1)', evalTrap.category === 'GENUINE_ACTIVE' && evalTrap.totalTasks === 1 && evalTrap.pendingTasks === 1);

  // Test 6-9: Auto-Promotion Engine in a sandbox component (always cleaned up)
  const sbComp = '__qc_selftest__';
  const sbActive = path.join(ROOT, 'Quick Save', 'Active', sbComp);
  const sbComplete = path.join(ROOT, 'Quick Save', 'Complete', sbComp);
  try {
    fs.mkdirSync(sbActive, { recursive: true });
    const sbFile = path.join(sbActive, 'V0.0.1_[impl]_selftest.md');
    fs.writeFileSync(sbFile, '---\nversion: "0.0.1"\ntype: impl\nstatus: active\noutcome: pending\n---\n- [x] Done\n\n```yaml\nstatus: active\n```\n', 'utf8');
    const dest = promotePlanToComplete(sbFile);
    const out = fs.readFileSync(dest, 'utf8');
    const outFm = splitFrontmatter(out).fm;
    assert('Promote routes to Complete/<same component> and removes source', path.dirname(dest) === sbComplete && !fs.existsSync(sbFile));
    assert('Promote stamps frontmatter only (body YAML untouched)', /^status: complete$/m.test(outFm) && /^outcome: shipped$/m.test(outFm) && out.includes('```yaml\nstatus: active\n```'));

    fs.writeFileSync(sbFile, '---\nstatus: active\n---\n- [x] Again\n', 'utf8');
    let blocked = false;
    try { promotePlanToComplete(sbFile); } catch (e) { blocked = /DEST_EXISTS/.test(e.message); }
    assert('Promote refuses to overwrite an existing Complete file (source kept)', blocked && fs.existsSync(sbFile));

    const outside = path.join(ROOT, 'scratch', 'V0.0.2_selftest_outside.md');
    const target = resolveCompleteTarget(outside);
    assert('Promote never escapes Quick Save/Complete (no ".." component)', !target.component.startsWith('..') && target.targetDir.startsWith(path.join(ROOT, 'Quick Save', 'Complete')));
  } finally {
    fs.rmSync(sbActive, { recursive: true, force: true });
    fs.rmSync(sbComplete, { recursive: true, force: true });
  }

  // Cleanup
  if (fs.existsSync(tempFileB)) fs.unlinkSync(tempFileB);
  if (fs.existsSync(qDest)) fs.unlinkSync(qDest);
  if (fs.existsSync(testActiveReal)) fs.unlinkSync(testActiveReal);
  if (fs.existsSync(testActiveDone)) fs.unlinkSync(testActiveDone);
  if (fs.existsSync(testTrap)) fs.unlinkSync(testTrap);

  console.log(`\n${c.bold}Test Summary: ${c.green}${passed} passed${c.reset}, ${failed > 0 ? c.red + failed + ' failed' : c.gray + '0 failed'}${c.reset}`);
  process.exit(failed > 0 ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────
// MAIN EXECUTION (Audit & Auto-Fix)
// ─────────────────────────────────────────────────────────────
console.log(`${c.bold}${c.cyan}═══════════════════════════════════════════════════════════════${c.reset}`);
console.log(`${c.bold}${c.cyan}  QC Radar & Workspace Hygiene Engine (V3.1.0 - Active Reality Radar + Safe Auto-Promote)${c.reset} ${c.gray}(Mode: ${isFixMode ? c.yellow + 'AUTO-FIX (ARMORED)' : c.green + 'AUDIT ONLY'}${c.gray})${c.reset}`);
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
const genuineActive = [];
const falseActive = [];
const staleActive = [];
const untaskedStudies = [];

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

  // Evaluate Active Reality
  const reality = evaluateActiveReality(af);
  if (reality) {
    if (reality.category === 'ALL_TASKS_DONE' || reality.category === 'EXPLICIT_COMPLETION' || reality.category === 'UNMOVED_COMPLETE') {
      falseActive.push({ path: af, reality });
    } else if (reality.category === 'STALE_ACTIVE' || reality.category === 'STALE_NO_TASKS') {
      staleActive.push({ path: af, reality });
    } else if (reality.category === 'UNTASKED_STUDY') {
      untaskedStudies.push({ path: af, reality });
    } else {
      genuineActive.push({ path: af, reality });
    }
  }

  if (reality && reality.category === 'UNMOVED_COMPLETE') {
    unmovedComplete.push(af);
  }
}

// ─────────────────────────────────────────────────────────────
// PHASE 1b: Active Reality Radar (ตรวจเช็คงานค้างจริง vs ค้างหลอก)
// ─────────────────────────────────────────────────────────────
console.log(`\n${c.bold}[Phase 1b] Active Reality Radar (ตรวจสอบงานค้างจริง vs ค้างหลอก)...${c.reset}`);
console.log(`  • 🟢 Genuine Active (ค้างจริง กำลังทำอยู่): ${genuineActive.length > 0 ? c.green + c.bold + genuineActive.length : c.gray + '0'}${c.reset}`);
console.log(`  • 🔴 False Active (เสร็จแล้วแต่ค้างหลอก/ลืมย้าย): ${falseActive.length > 0 ? c.red + c.bold + falseActive.length : c.green + '0'}${c.reset}`);
console.log(`  • ❄️ Stale / Dormant (ดองเกิน 30 วัน): ${staleActive.length > 0 ? c.yellow + staleActive.length : c.green + '0'}${c.reset}`);
console.log(`  • 🟡 Untasked Deliverables (Study/Docs เก่าเกิน 14 วัน): ${untaskedStudies.length > 0 ? c.cyan + untaskedStudies.length : c.green + '0'}${c.reset}`);

if (genuineActive.length > 0) {
  console.log(`\n  ${c.bold}${c.green}🟢 รายการที่ค้างจริง (Genuine Active - Work In Progress):${c.reset}`);
  genuineActive.forEach(item => {
    console.log(`    - ${c.bold}${path.relative(ROOT, item.path)}${c.reset}`);
    console.log(`      ↳ ${c.gray}${item.reality.statusText}${c.reset}`);
  });
}

if (falseActive.length > 0) {
  console.log(`\n  ${c.bold}${c.red}🔴 รายการที่เสร็จแล้วแต่ลืมเปลี่ยน/ลืมย้าย (False Active - Ready for Complete):${c.reset}`);
  falseActive.forEach(item => {
    console.log(`    - ${c.bold}${path.relative(ROOT, item.path)}${c.reset}`);
    console.log(`      ↳ ${c.red}${item.reality.statusText}${c.reset}`);
  });
}

if (staleActive.length > 0) {
  console.log(`\n  ${c.bold}${c.yellow}❄️ รายการที่ดองนาน (Stale Active > 30 วัน - แนะนำ Icebox หรือรีวิว):${c.reset}`);
  staleActive.forEach(item => {
    console.log(`    - ${c.bold}${path.relative(ROOT, item.path)}${c.reset}`);
    console.log(`      ↳ ${c.yellow}${item.reality.statusText}${c.reset}`);
  });
}

if (untaskedStudies.length > 0) {
  console.log(`\n  ${c.bold}${c.cyan}🟡 งานวิจัย/เอกสารไม่มี Task (Untasked Review - ตรวจสอบว่าสรุปจบหรือยัง):${c.reset}`);
  untaskedStudies.forEach(item => {
    console.log(`    - ${c.bold}${path.relative(ROOT, item.path)}${c.reset}`);
    console.log(`      ↳ ${c.cyan}${item.reality.statusText}${c.reset}`);
  });
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
console.log(`  • False Active Plans (Finished but Unmoved): ${falseActive.length > 0 ? c.red + c.bold + falseActive.length : c.green + '0'}${c.reset}`);
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

  const handled = new Set();
  const falseActiveSet = new Set(falseActive.map(fa => fa.path));
  const conflictedSet = new Set(conflictedGhosts.map(g => g.activePath));

  // 1. Quarantine verified safe ghosts (Zero Hard Unlink)
  for (const g of safeGhosts) {
    const qPath = quarantineFile(g.activePath, g.reason);
    handled.add(g.activePath);
    console.log(`  ${c.green}✔ Quarantined ghost:${c.reset} ${path.basename(g.activePath)} ➔ ${path.relative(ROOT, qPath)}`);
    actionsTaken++;
  }

  // 2. Route loose files (finished loose plans are left for step 3 to promote directly)
  for (const lf of looseActiveFiles) {
    if (handled.has(lf) || falseActiveSet.has(lf) || !fs.existsSync(lf)) continue;
    const route = determineLooseFileDestination(lf);
    if (!route) continue;
    const dest = path.join(route.targetDir, path.basename(lf));
    if (fs.existsSync(dest)) {
      console.log(`  ${c.red}✖ Skipped loose file (destination exists):${c.reset} ${path.basename(lf)}`);
      continue;
    }
    fs.mkdirSync(route.targetDir, { recursive: true });
    fs.renameSync(lf, dest);
    handled.add(lf);
    console.log(`  ${c.green}✔ Routed loose file:${c.reset} ${path.basename(lf)} ➔ ${path.relative(ROOT, dest)} (${route.reason || route.action})`);
    actionsTaken++;
  }

  // 3. Auto-promote False Active plans (crash-safe, never overwrites, skips conflicts)
  for (const fa of falseActive) {
    if (handled.has(fa.path) || !fs.existsSync(fa.path)) continue;
    if (conflictedSet.has(fa.path)) {
      console.log(`  ${c.red}✖ Blocked promotion (Complete copy has different content — resolve manually):${c.reset} ${path.basename(fa.path)}`);
      continue;
    }
    try {
      const dest = promotePlanToComplete(fa.path);
      handled.add(fa.path);
      console.log(`  ${c.green}✔ Auto-promoted false active plan:${c.reset} ${path.basename(fa.path)} ➔ ${path.relative(ROOT, dest)}`);
      actionsTaken++;
    } catch (e) {
      console.log(`  ${c.red}✖ Promotion failed:${c.reset} ${path.basename(fa.path)} — ${e.message}`);
    }
  }

  // 4. Archive Core-VPS floating files (recomputed AFTER promotion, archived by real major version)
  if (fs.existsSync(coreVpsCompleteDir)) {
    const floatingNow = fs.readdirSync(coreVpsCompleteDir, { withFileTypes: true })
      .filter(i => i.isFile() && i.name.endsWith('.md'))
      .map(i => i.name)
      .sort(compareSemVer);
    const toArchive = floatingNow.length > 7 ? floatingNow.slice(0, floatingNow.length - 6) : [];
    for (const f of toArchive) {
      const v = parseSemVer(f);
      const archiveDir = path.join(coreVpsCompleteDir, v ? `V${v.major}` : '_Legacy');
      const dest = path.join(archiveDir, f);
      if (fs.existsSync(dest)) {
        console.log(`  ${c.red}✖ Skipped archive (destination exists):${c.reset} ${f}`);
        continue;
      }
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(path.join(coreVpsCompleteDir, f), dest);
      console.log(`  ${c.green}✔ Archived SemVer floating file:${c.reset} ${f} ➔ ${path.relative(ROOT, archiveDir)}/`);
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
  console.log(`\n${c.gray}Tip: Run ${c.bold}node scripts/qc-audit.js --fix${c.reset}${c.gray} to quarantine ghosts, route loose files, auto-promote finished plans, and re-index manifest.${c.reset}`);
}

console.log(`\n${c.bold}${c.green}═══════════════════════════════════════════════════════════════${c.reset}`);
console.log(`${c.bold}${c.green}  QC Radar Execution Complete!${c.reset}`);
console.log(`${c.bold}${c.green}═══════════════════════════════════════════════════════════════${c.reset}\n`);
