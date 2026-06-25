---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-15
brain_task_id: ~
source: oracle
proposal_id: EVO-20260615-2170
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Discord AI module now fails to load because `clearHistory` is declared twice, breaking both Discord replies and LINE Hermes fast-path replies
---

# Oracle Proposal (EVO-20260615-2170)
**Mission:** maintain
**Level:** critical
**Title:** Discord AI module now fails to load because `clearHistory` is declared twice, breaking both Discord replies and LINE Hermes fast-path replies

## Evidence
```json
{
  "logs": "brain-app and discord-bot error logs both show `SyntaxError: Identifier 'clearHistory' has already been declared` from Node ESM module compilation, with stack frames at `compileSourceTextModule` and `ModuleLoader.loadAndTranslate`.",
  "blast_radius": "`routes/line-hermes.js` dynamically imports `/discord-bot/lib/ai.js` for the LINE fast path and destructures `{ chat, clearHistory }`; the Discord bot also imports the same module, so the parse error affects both LINE Honey/Pinky integration and Discord AI handling.",
  "ops_context": "Recent restart noise aligns with many deploy-hook `deploy_executed` events on 2026-06-15, so this is not being diagnosed from PM2 restart counts alone; the actionable evidence is the live ESM syntax error in logs after deploy.",
  "not_duplicate_of_memory": "This is distinct from the rejected CommonJS `require` ES-module issue and from the approved generic deploy-preflight finding; the new concrete regression is a duplicate `clearHistory` declaration in the shared Discord AI module."
}
```

## Recommended Action
Inspect `discord-bot/lib/ai.js` for duplicate `clearHistory` declarations/exports introduced by the latest deploy, keep a single canonical implementation/export, then restart brain-app and discord-bot and verify LINE fast-path and a Discord AI message no longer emit the ESM compilation error.
