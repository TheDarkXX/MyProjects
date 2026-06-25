---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-17
brain_task_id: ~
source: oracle
proposal_id: EVO-20260517-9820
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Agent command endpoint can shell-inject through the unescaped route parameter
---

# Oracle Proposal (EVO-20260517-9820)
**Mission:** guard
**Level:** critical
**Title:** Agent command endpoint can shell-inject through the unescaped route parameter

## Evidence
```json
{
  "file": "/root/brain-app/routes/agents.js",
  "route": "POST /api/agents/:id/command",
  "code": "const agentId = c.req.param('id'); ... const cmd = `openclaw agent --agent ${agentId} --message '${escaped}' --timeout 55000 --json`; const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });",
  "why_new": "Not present in previous approved/deployed/rejected/iceboxed/pending proposal memory. This is distinct from the already-tracked PM2 secret exposure issue.",
  "impact": "Any authenticated caller able to hit this route can put shell metacharacters in :id and execute extra shell commands under the brain-app process user. The message field is partially escaped, but agentId is inserted raw into child_process.exec."
}
```

## Recommended Action
Replace execAsync(commandString) with execFile/spawn using an argument array, or strictly validate agentId against the actual OpenClaw agent id list before execution. Prefer execFile('openclaw', ['agent','--agent', agentId, '--message', message, '--timeout','55000','--json']).
