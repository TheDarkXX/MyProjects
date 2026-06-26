---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-17
brain_task_id: ~
source: oracle
proposal_id: EVO-20260517-8468
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Production deploys can restart brain-app onto syntactically invalid JavaScript without a preflight gate
---

# Oracle Proposal (EVO-20260517-8468)
**Mission:** guard
**Level:** critical
**Title:** Production deploys can restart brain-app onto syntactically invalid JavaScript without a preflight gate

## Evidence
```json
{
  "mode": "delta",
  "web_error_log": "brain-app error log contains repeated ESM load failures after recent deploy waves: `SyntaxError: Invalid or unexpected token` and later `SyntaxError: Unexpected token ','` at `compileSourceTextModule` / `ModuleLoader.loadAndTranslate`.",
  "ops_events": "readOpsEvents shows dense deploy-hook activity on 2026-05-17, including deploys at 12:35:56, 12:43:57, 12:48:21, 12:50:28, and 12:51:18 for `brain-app discord-bot`.",
  "pm2_context": "pm2Status shows brain-app is online now, but the process was restarted by deploy activity; this finding is based on error logs plus ops_events, not restart counts alone.",
  "impact": "A single malformed comma/token can take the API through repeated failed starts during fast deploy loops; PM2 may eventually recover after another push, but production has no syntax/type smoke gate before reload."
}
```

## Recommended Action
Add a deploy-hook preflight before PM2 reload: run `node --check` or an ESM import smoke test over changed server/route files plus a minimal `/api/health` post-reload verification. If preflight fails, abort reload and record an ops_event with the failing file/line.
