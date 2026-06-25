---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-06-14
brain_task_id: ~
source: oracle
proposal_id: EVO-20260614-898
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: LINE Hermes webhook can shell-inject through a LINE display name before user text escaping is applied
---

# Oracle Proposal (EVO-20260614-898)
**Mission:** guard
**Level:** critical
**Title:** LINE Hermes webhook can shell-inject through a LINE display name before user text escaping is applied

## Evidence
```json
{
  "code_path": "/root/brain-app/routes/line-hermes.js",
  "route": "POST /api/line-hermes or mounted LINE webhook route",
  "active_runtime_evidence": "brain-app log shows recent LINE Hermes executions for line_user_U88fe0e5b557985bd1a8ff1dbc696beb9 with user messages reaching `hermes -z ... -c ...`",
  "vulnerable_pattern": "The route builds `cmd = hermes -z '${linePrefix}${safeText}' -c '${sessionId}'`; only `userText` is escaped as `safeText`, while `linePrefix` includes `userName` from LINE profile.displayName without shell escaping.",
  "impact": "A LINE user can set a displayName containing a single quote plus shell syntax, causing arbitrary command execution as the brain-app process when they send a message. This is distinct from the already-tracked Agent command endpoint injection because it is in the LINE webhook/Hermes bridge."
}
```

## Recommended Action
Do not invoke Hermes through shell string interpolation. Replace `execAsync(cmd)` with `execFile`/`spawn` using argv, e.g. `['-z', linePrefix + userText, '-c', sessionId, '-t', toolsets]`, or at minimum shell-escape every interpolated field including `linePrefix`, `userName`, `sessionId`, and `toolsets`. Add a regression test with a LINE displayName containing `' ; touch /tmp/pwned ; echo '` to prove it is passed as text, not executed.
