import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { execSync, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const require = createRequire(import.meta.url);
const pdfParse = require(path.join(PROJECT_ROOT, 'discord-bot/node_modules/pdf-parse/lib/pdf-parse.js'));

const BANK_ALIASES = {
  BBL: 'BBL',
  Krungsri: 'Krungsri',
  KBank: 'KBank',
  SCB: 'SCB',
  CardX: 'SCB',
};

const PASSWORDS = {
  KBank: '19051985',
  SCB: '19051985',
  Krungsri: '19May1985',
  BBL: '19051985',
};

const DEFAULT_DUE_DAYS = {
  BBL: 3,
  Krungsri: 8,
  KBank: 10,
  SCB: 12,
};

const VPS_HOST = '185.250.38.247';
const SSH_KEY = fs.existsSync(path.join(os.homedir(), '.ssh', 'id_ed25519'))
  ? path.join(os.homedir(), '.ssh', 'id_ed25519')
  : path.join(os.homedir(), '.ssh', 'id_rsa');

function loadEnvFile(envPath) {
  const resolved = path.resolve(PROJECT_ROOT, envPath);
  if (!fs.existsSync(resolved)) return {};
  const env = {};
  for (const rawLine of fs.readFileSync(resolved, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function getFlagValue(argv, flag) {
  const idx = argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < argv.length) return argv[idx + 1];
  return null;
}

function parseCliArgs(argv) {
  const flags = new Set();
  const positional = [];
  const skipIndices = new Set();
  for (let i = 0; i < argv.length; i++) {
    if (skipIndices.has(i)) continue;
    const a = argv[i];
    if (['--push', '--due', '--email-id'].includes(a)) {
      flags.add(a);
      skipIndices.add(i + 1);
    } else if (a.startsWith('--')) {
      flags.add(a);
    } else {
      positional.push(a);
    }
  }
  const isCompareMode = positional[0] === 'compare';
  return {
    isAgMode: flags.has('--ag-mode'),
    isSync: flags.has('--sync'),
    isForce: flags.has('--force'),
    isCompareMode,
    pushFile: getFlagValue(argv, '--push'),
    dueOverride: getFlagValue(argv, '--due'),
    emailId: getFlagValue(argv, '--email-id'),
    targetMonth: isCompareMode ? positional[1] : positional[0],
    targetBank: isCompareMode ? positional[2] : positional[1],
  };
}

function syncPDFsFromVPS(month, statementsDir) {
  fs.mkdirSync(statementsDir, { recursive: true });
  console.log(`Syncing ${month} PDFs from VPS...`);
  try {
    const listCmd = `ssh -i "${SSH_KEY}" -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=no root@${VPS_HOST} "ls -1 /root/brain-app/cc-statements/${month}/*.pdf /root/brain-app/cc-statements/*-${month}-*.pdf 2>/dev/null || true"`;
    const remoteFiles = execSync(listCmd, { encoding: 'utf8' })
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    if (remoteFiles.length === 0) {
      console.log(`  [!] No remote PDFs found on VPS for ${month}.`);
      return;
    }
    const uniqueByBase = new Map();
    for (const rf of remoteFiles) {
      const base = path.basename(rf);
      if (!uniqueByBase.has(base) || rf.includes(`/${month}/`)) {
        uniqueByBase.set(base, rf);
      }
    }
    let copied = 0;
    for (const [base, rf] of uniqueByBase) {
      const localPath = path.join(statementsDir, base);
      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) continue;
      execSync(`scp -i "${SSH_KEY}" -o BatchMode=yes -o ConnectTimeout=10 root@${VPS_HOST}:"${rf}" "${localPath}"`, { stdio: 'ignore' });
      copied++;
    }
    console.log(`  [+] Synced ${copied} new PDF(s) (${uniqueByBase.size} total available).`);
  } catch (e) {
    console.log(`  [!] VPS PDF sync failed (${e.message}), using local files if present.`);
  }
}

function groupBankPDFs(files, dirPath) {
  const bankFiles = {};
  for (const file of files) {
    let bankKey = null;
    for (const key of Object.keys(BANK_ALIASES)) {
      if (file.includes(key)) {
        bankKey = BANK_ALIASES[key];
        break;
      }
    }
    if (!bankKey) continue;
    if (!bankFiles[bankKey]) bankFiles[bankKey] = [];
    const fullPath = path.join(dirPath, file);
    const size = fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0;
    bankFiles[bankKey].push({ file, size });
  }
  // Sort descending by filename (newest date first), then larger file size first
  for (const bank of Object.keys(bankFiles)) {
    bankFiles[bank].sort((a, b) => {
      const nameCmp = b.file.localeCompare(a.file);
      return nameCmp !== 0 ? nameCmp : b.size - a.size;
    });
  }
  return bankFiles;
}

function isStandaloneTaxInvoice(text) {
  const upper = text.toUpperCase();
  const hasTaxHeader = upper.includes('TAX INVOICE') || text.includes('ใบกำกับภาษี');
  const hasStmtMarker =
    upper.includes('PREVIOUS BALANCE') ||
    upper.includes('TOTAL BALANCE') ||
    upper.includes('MINIMUM PAYMENT') ||
    text.includes('ยอดยกมา') ||
    text.includes('ยอดรวมรายการใช้จ่ายใหม่') ||
    text.includes('ยอดที่ต้องชำระ');
  return hasTaxHeader && !hasStmtMarker;
}

async function extractText(filePath, bankKey) {
  const pw = PASSWORDS[bankKey];
  const pdfBuf = fs.readFileSync(filePath);

  // Use VPS pdftotext -layout via stdin pipe for all banks (column-accurate & path-agnostic)
  try {
    const text = execFileSync(
      'ssh',
      [
        '-i', SSH_KEY,
        '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=8',
        '-o', 'StrictHostKeyChecking=no',
        `root@${VPS_HOST}`,
        `pdftotext -layout -upw ${pw} - -`,
      ],
      { input: pdfBuf, encoding: 'utf8', maxBuffer: 15 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] }
    );
    if (text && text.trim().length > 20) return text;
  } catch {
    console.log(`  [!] VPS pdftotext fallback to local pdf-parse for ${bankKey}...`);
  }

  const data = await pdfParse({ data: pdfBuf, password: pw });
  return data.text;
}

async function selectBestStatementForBank(candidates, dirPath, bankKey) {
  for (const cand of candidates) {
    const fullPath = path.join(dirPath, cand.file);
    const text = await extractText(fullPath, bankKey);
    if (candidates.length > 1 && isStandaloneTaxInvoice(text)) {
      console.log(`  [!] Skipping standalone Tax Invoice PDF: ${cand.file}`);
      continue;
    }
    return { file: cand.file, text };
  }
  // Fallback to first candidate if all filtered
  const fallback = candidates[0];
  return { file: fallback.file, text: await extractText(path.join(dirPath, fallback.file), bankKey) };
}

function injectLineIDs(text) {
  let lineNum = 0;
  return text
    .split('\n')
    .map(line => {
      if (line.trim() === '') return line;
      lineNum++;
      return `[L${String(lineNum).padStart(3, '0')}] ${line}`;
    })
    .join('\n');
}

function stripLineIDs(text) {
  return text ? text.replace(/^\[L\d{3}\]\s*/gm, '').trim() : text;
}

function extractStatedTotal(bank, text) {
  const SKIP_KEYWORDS = ['ยอดยกมา', 'Previous', 'Total Balance', 'ยอดรวมทั้งสิ้น', 'ดอกเบี้ย', 'Interest', 'ขั้นต่ำ', 'Minimum', 'ยอดคงค้าง'];
  const b = bank.toLowerCase();
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || SKIP_KEYWORDS.some(kw => line.includes(kw))) continue;
    let match = null;
    if (b === 'kbank' && line.includes('NEW TRANSACTIONS TOTAL')) {
      match = line.match(/NEW TRANSACTIONS TOTAL\s*:?\s*([\d,]+\.\d{2})/i);
    } else if (b === 'krungsri' && (line.includes('ยอดรวมรายการใช้จ่ายใหม่') || line.includes('Total New Transaction Amount'))) {
      match = line.match(/(?:ยอดรวมรายการใช้จ่ายใหม่|Total New Transaction Amount)[^\d]*([\d,]+\.\d{2})/i);
    } else if ((b === 'scb' || b === 'cardx') && (line.includes('ยอดรวมรายการใช้จ่ายใหม่') || line.includes('TOTAL NEW BALANCE'))) {
      match = line.match(/(?:ยอดรวมรายการใช้จ่ายใหม่|TOTAL NEW BALANCE)[^\d]*([\d,]+\.\d{2})/i);
    } else if (b === 'bbl' && line.includes('ยอดรวมรายการใช้จ่ายใหม่')) {
      match = line.match(/ยอดรวมรายการใช้จ่ายใหม่[^\d]*([\d,]+\.\d{2})/i);
    }
    if (match) return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

async function callApiExtract(promptText, statementText, env) {
  const numberedText = injectLineIDs(statementText);
  const fullPrompt = `${promptText}\n\n=== STATEMENT TEXT ===\n${numberedText}\n=== END STATEMENT TEXT ===`;
  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;

  if (geminiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    });
    const data = await res.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Gemini Direct error: ' + JSON.stringify(data).slice(0, 200));
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { transactions: [] };
  }

  if (!env.OPENROUTER_API_KEY) {
    throw new Error('No API key found (GEMINI_API_KEY / GOOGLE_API_KEY / OPENROUTER_API_KEY). Use --ag-mode for free extraction.');
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: 0.1,
    }),
  });
  const data = await response.json();
  if (!data.choices?.[0]) throw new Error('OpenRouter error: ' + JSON.stringify(data).slice(0, 200));
  const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { transactions: [] };
}

function syncVPSDB() {
  console.log('Syncing VPS Production DB...');
  try {
    const dbDest = path.resolve(PROJECT_ROOT, 'scratch/brain_vps.db');
    fs.mkdirSync(path.dirname(dbDest), { recursive: true });
    execSync(`scp -i "${SSH_KEY}" -o BatchMode=yes -o ConnectTimeout=8 root@${VPS_HOST}:/root/brain-app/db/brain.db "${dbDest}"`, { stdio: 'ignore' });
    console.log('VPS DB Synced successfully.');
  } catch {
    console.log('Could not sync VPS DB, using cached local copy if available.');
  }
}

function getVPSTruth(month, bank) {
  const dbPath = path.resolve(PROJECT_ROOT, 'scratch/brain_vps.db');
  if (!fs.existsSync(dbPath)) return { count: 0, sum: 0 };
  try {
    const py = `import sqlite3, json, sys
conn = sqlite3.connect(sys.argv[1])
q = "SELECT price, is_refund FROM cc_credit_cards WHERE statement_month = ?"
p = [sys.argv[2]]
if len(sys.argv) > 3 and sys.argv[3]:
    q += " AND credit_card = ?"
    p.append(sys.argv[3])
rows = conn.execute(q, p).fetchall()
s = sum((float(r[0]) if r[0] else 0.0) * (-1 if r[1] else 1) for r in rows)
print(json.dumps({"count": len(rows), "sum": round(s, 2)}))`;
    const out = execFileSync('python', ['-c', py, dbPath, month, bank || ''], { encoding: 'utf8' });
    return JSON.parse(out.trim());
  } catch {
    return { count: 0, sum: 0 };
  }
}

function calculateAutoSum(txs) {
  return Math.round(
    txs.reduce((sum, t) => {
      const p = Number(t.price) || 0;
      return (t.is_refund == 1 || t.is_refund === true) ? sum - p : sum + p;
    }, 0) * 100
  ) / 100;
}

function formatJsNumber(val) {
  const n = Math.abs(Number(val) || 0);
  return Number.isInteger(n) ? String(n) : String(n);
}

function computeDefaultDueDate(bank, statementMonth) {
  const dueDay = DEFAULT_DUE_DAYS[bank] || 14;
  const [yyyy, mm] = statementMonth.split('-').map(Number);
  const due = new Date(yyyy, mm, dueDay); // mm is 1-based, so Date(yyyy, mm, day) is next month
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
}

function pushStatementsToVPS(opts) {
  const raw = JSON.parse(fs.readFileSync(path.resolve(opts.pushFile), 'utf8'));
  const entries = Array.isArray(raw) ? raw : (raw.statements ? raw.statements : [raw]);

  const allBatchItems = [];
  const dueByBank = {};
  let statementMonth = opts.targetMonth;

  for (const entry of entries) {
    const bank = BANK_ALIASES[entry.bank] || entry.bank;
    const month = entry.statement_month || statementMonth;
    if (!bank || !month || !Array.isArray(entry.transactions) || entry.transactions.length === 0) {
      throw new Error(`Invalid push entry: missing bank/statement_month/transactions`);
    }
    statementMonth = month;
    dueByBank[bank] = opts.dueOverride || entry.due_date || computeDefaultDueDate(bank, month);

    const netNew = calculateAutoSum(entry.transactions);
    if (entry.pdf_total_due !== undefined && entry.prev_balance !== undefined && entry.payments !== undefined) {
      const calcDue = Math.round((Number(entry.prev_balance) - Number(entry.payments) + netNew) * 100) / 100;
      const diff = Math.round((calcDue - Number(entry.pdf_total_due)) * 100) / 100;
      console.log(`[${bank}] items=${entry.transactions.length} net_new=${netNew.toFixed(2)} calc_due=${calcDue.toFixed(2)} pdf=${Number(entry.pdf_total_due).toFixed(2)} diff=${diff.toFixed(2)}`);
      if (Math.abs(diff) > 0.01 && !opts.isForce) {
        throw new Error(`[${bank}] Math proof failed (diff=${diff.toFixed(2)}). Fix transactions or pass --force.`);
      }
    } else {
      console.log(`[${bank}] items=${entry.transactions.length} net_new=${netNew.toFixed(2)} (no balance equation fields; use --force or include prev_balance/payments/pdf_total_due)`);
    }

    const seenRefs = {};
    for (const tx of entry.transactions) {
      const date = tx.date;
      const name = stripLineIDs(tx.name);
      const desc = stripLineIDs(tx.description || '');
      const price = Math.abs(Number(tx.price) || 0);
      const normName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      const baseRef = `cc-dedup-${bank}-${date}-${normName}-${formatJsNumber(price)}`;
      seenRefs[baseRef] = (seenRefs[baseRef] || 0) + 1;
      const finalRef = seenRefs[baseRef] > 1 ? `${baseRef}-${seenRefs[baseRef]}` : baseRef;
      allBatchItems.push({
        date,
        name: name || 'Unknown',
        description: desc,
        price,
        category: tx.category || 'Other',
        credit_card: bank,
        payee: tx.payee || 'Personal',
        year_month: date.slice(0, 7),
        source_ref: finalRef,
        is_refund: tx.is_refund ? 1 : 0,
        statement_month: month,
      });
    }
  }

  const payloadB64 = Buffer.from(JSON.stringify({ items: allBatchItems }), 'utf8').toString('base64');
  const dueMapJson = JSON.stringify(dueByBank);
  const emailId = opts.emailId || '';
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);

  const remoteBash = `set -e
mkdir -p /root/brain-app/db/backups
cp -p /root/brain-app/db/brain.db /root/brain-app/db/backups/brain.db.pre_credit_push_${ts}.bak
python3 -c 'import base64, os; open("/tmp/credit_push_batch.json","wb").write(base64.b64decode(os.environ["PAYLOAD_B64"]))'
TOKEN=$(grep -E '^GATEWAY_AUTH_TOKEN=' /root/brain-app/.env | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
echo "=== BATCH INSERT ==="
curl -sf -X POST http://127.0.0.1:3001/api/cc/credit-cards/batch \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${TOKEN}" \\
  -H "X-Claw-Cron: cron-cc-statements" \\
  -H "X-Agent-Id: credit-card-agent" \\
  --data-binary @/tmp/credit_push_batch.json
echo ""
rm -f /tmp/credit_push_batch.json
echo "=== GENERATE CC_BILLS ==="
SUMMARY=$(curl -sf -H "Authorization: Bearer \${TOKEN}" "http://127.0.0.1:3001/api/cc/credit-cards/statement-summary?statement_month=${statementMonth}")
BILLS_REQ=$(SUMMARY="$SUMMARY" DUE_MAP='${dueMapJson}' MONTH="${statementMonth}" python3 -c '
import json, os
s = json.loads(os.environ["SUMMARY"])
dm = json.loads(os.environ["DUE_MAP"])
items = [{"credit_card": x["credit_card"], "total": x["total"], "txn_count": x["txn_count"], "due_date": dm.get(x["credit_card"], dm.get(x["credit_card"].upper(), os.environ["MONTH"]+"-28"))} for x in s.get("summaries", []) if not x.get("already_exists") and x["credit_card"] in dm]
print(json.dumps({"statement_month": os.environ["MONTH"], "items": items}))
')
if echo "$BILLS_REQ" | grep -q '"credit_card"'; then
  curl -sf -X POST http://127.0.0.1:3001/api/cc/bills/generate-from-cc \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer \${TOKEN}" \\
    -d "$BILLS_REQ"
  echo ""
else
  echo '{"skipped":"already_exists"}'
fi
if [ -n "${emailId}" ]; then
  EMAIL_ID="${emailId}" python3 -c '
import json, os
pf = "/root/brain-app/discord-bot/data/processed_cc_emails.json"
os.makedirs(os.path.dirname(pf), exist_ok=True)
arr = json.load(open(pf)) if os.path.exists(pf) else []
if os.environ["EMAIL_ID"] not in arr: arr.append(os.environ["EMAIL_ID"])
json.dump(arr[-100:], open(pf, "w"))
'
fi
echo "=== DB VERIFY (${statementMonth}) ==="
python3 -c '
import sqlite3
c = sqlite3.connect("/root/brain-app/db/brain.db").cursor()
print(c.execute("SELECT credit_card, COUNT(*), ROUND(SUM(CASE WHEN is_refund=1 THEN -price ELSE price END), 2) FROM cc_credit_cards WHERE statement_month=? GROUP BY credit_card", ("${statementMonth}",)).fetchall())
'`;

  const fullCmd = `export PAYLOAD_B64='${payloadB64}'\n${remoteBash}`;
  const out = execFileSync(
    'ssh',
    ['-i', SSH_KEY, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', `root@${VPS_HOST}`, 'bash -s'],
    { input: fullCmd, encoding: 'utf8' }
  );
  console.log(out);
}

async function run() {
  const opts = parseCliArgs(process.argv.slice(2));
  if (opts.pushFile) {
    pushStatementsToVPS(opts);
    return;
  }

  if (!opts.targetMonth) {
    console.error('Usage: cc-flash-extract.js <YYYY-MM> [bank] [--ag-mode] [--sync] | compare <YYYY-MM> | --push <json>');
    process.exit(1);
  }

  const rootEnv = loadEnvFile('.env');
  const botEnv = loadEnvFile('discord-bot/.env');
  const env = { ...botEnv, ...rootEnv };

  if (!opts.isAgMode && !opts.isCompareMode && !env.GEMINI_API_KEY && !env.GOOGLE_API_KEY && !env.OPENROUTER_API_KEY) {
    console.error('ERROR: No API key found in .env for API mode. Use --ag-mode for free extraction.');
    process.exit(1);
  }

  const statementsDir = path.resolve(PROJECT_ROOT, `cc-statements/${opts.targetMonth}`);
  if (!fs.existsSync(statementsDir) || fs.readdirSync(statementsDir).filter(f => f.endsWith('.pdf')).length === 0 || opts.isSync) {
    syncPDFsFromVPS(opts.targetMonth, statementsDir);
  }
  if (!fs.existsSync(statementsDir)) {
    console.error(`ERROR: Directory not found: cc-statements/${opts.targetMonth}`);
    process.exit(1);
  }

  console.log(opts.isCompareMode ? `\n=== CC STATEMENT COMPARE MODE: ${opts.targetMonth} ===` : `\n=== CC STATEMENT EXTRACTOR: ${opts.targetMonth} ===`);
  syncVPSDB();

  const allPdfs = fs.readdirSync(statementsDir).filter(f => f.endsWith('.pdf'));
  const bankPdfMap = groupBankPDFs(allPdfs, statementsDir);
  const results = [];

  for (const [bankKey, candidates] of Object.entries(bankPdfMap)) {
    if (opts.targetBank && bankKey.toLowerCase() !== opts.targetBank.toLowerCase()) continue;

    const promptPath = path.resolve(__dirname, '..', 'resources', 'prompts', `${bankKey.toLowerCase()}.txt`);
    if (!fs.existsSync(promptPath)) {
      console.log(`  [!] No tuned prompt found for ${bankKey}, skipping.`);
      continue;
    }
    const promptTemplate = fs
      .readFileSync(promptPath, 'utf8')
      .replaceAll('{BANK_NAME}', bankKey)
      .replaceAll('{STATEMENT_MONTH}', opts.targetMonth)
      .replaceAll('{YEAR}', opts.targetMonth.split('-')[0]);

    let aiCount = 0;
    let autoSum = 0;
    let pdfTruth = null;

    if (opts.isAgMode) {
      try {
        const { file, text } = await selectBestStatementForBank(candidates, statementsDir, bankKey);
        console.log(`\n>> Selected: ${file} (${bankKey})`);
        const numberedText = injectLineIDs(text);
        const vpsTruth = getVPSTruth(opts.targetMonth, bankKey);
        const statedNew = extractStatedTotal(bankKey, text);

        console.log(`\n===AG_BANK_START:${bankKey}===`);
        console.log(`PDF_FILE: ${file}`);
        console.log(`PROMPT_FILE: ${bankKey.toLowerCase()}.txt`);
        console.log(`VPS_TRUTH: ${JSON.stringify(vpsTruth)}`);
        console.log(`PDF_STATED_NEW: ${statedNew !== null ? statedNew : 'null'}`);
        console.log(`===STATEMENT_TEXT_START===`);
        console.log(numberedText);
        console.log(`===STATEMENT_TEXT_END===`);
        console.log(`===AG_BANK_END:${bankKey}===`);
      } catch (err) {
        console.error(`  [!] FAILED to extract ${bankKey}: ${err.message}`);
      }
      continue;
    } else if (!opts.isCompareMode) {
      try {
        const { file, text } = await selectBestStatementForBank(candidates, statementsDir, bankKey);
        console.log(`\n>> Processing: ${file} (${bankKey})`);
        const aiResult = await callApiExtract(promptTemplate, text, env);
        const txs = aiResult.transactions || [];
        for (const tx of txs) {
          if (tx.description) tx.description = stripLineIDs(tx.description);
          if (tx.name) tx.name = stripLineIDs(tx.name);
        }
        aiCount = txs.length;
        autoSum = calculateAutoSum(txs);
        pdfTruth = extractStatedTotal(bankKey, text);
        const cachePath = path.resolve(PROJECT_ROOT, `scratch/flash_extract_${bankKey}_${opts.targetMonth}.json`);
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify(txs, null, 2));
        console.log(`  [+] Extracted ${aiCount} items. Auto-Sum: ฿${autoSum.toFixed(2)}`);
      } catch (err) {
        console.error(`  [!] FAILED to extract ${bankKey}: ${err.message}`);
        continue;
      }
    } else {
      const cachePath = path.resolve(PROJECT_ROOT, `scratch/flash_extract_${bankKey}_${opts.targetMonth}.json`);
      if (!fs.existsSync(cachePath)) {
        console.log(`  [!] Cache not found for ${bankKey}, run extraction first.`);
        continue;
      }
      const txs = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      aiCount = txs.length;
      autoSum = calculateAutoSum(txs);
      try {
        const { text } = await selectBestStatementForBank(candidates, statementsDir, bankKey);
        pdfTruth = extractStatedTotal(bankKey, text);
      } catch {}
    }

    const vpsTruth = getVPSTruth(opts.targetMonth, bankKey);
    const diff = Math.abs(autoSum - vpsTruth.sum);
    results.push({
      Bank: bankKey,
      FlashItems: aiCount,
      VPSItems: vpsTruth.count,
      AutoSum: autoSum.toFixed(2),
      PDFTruth: pdfTruth !== null ? pdfTruth.toFixed(2) : 'N/A',
      VPS_Truth: vpsTruth.sum.toFixed(2),
      Match: diff <= 1.0 ? 'MATCH' : `Diff ฿${diff.toFixed(2)}`,
    });
  }

  if (opts.isAgMode) {
    console.log('\n===AG_MODE_COMPLETE===');
    console.log('AG agent: Apply resources/prompts/{bank}.txt, verify Prev - Pay + Net == Total Due (0.00 diff), and run --push <json> to import into VPS DB.');
    return;
  }

  console.log('\n+----------+-------+-------+---------------+---------------+----------------+-------------------+');
  console.log('| Bank     | Flash | VPS   | Auto-Sum (B)  | PDF Truth (B) | VPS Truth (B)  | Match             |');
  console.log('+----------+-------+-------+---------------+---------------+----------------+-------------------+');
  for (const r of results) {
    let matchIcon = r.Match === 'MATCH' ? 'MATCH 100%' : r.Match;
    if (r.PDFTruth !== 'N/A' && Math.abs(parseFloat(r.AutoSum) - parseFloat(r.PDFTruth)) > 1.0) {
      matchIcon = '⚠️ PDF MISMATCH';
    }
    console.log(`| ${r.Bank.padEnd(8)} | ${r.FlashItems.toString().padEnd(5)} | ${r.VPSItems.toString().padEnd(5)} | ${r.AutoSum.padEnd(13)} | ${r.PDFTruth.padEnd(13)} | ${r.VPS_Truth.padEnd(14)} | ${matchIcon.padEnd(17)} |`);
  }
  console.log('+----------+-------+-------+---------------+---------------+----------------+-------------------+');
}

run().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
