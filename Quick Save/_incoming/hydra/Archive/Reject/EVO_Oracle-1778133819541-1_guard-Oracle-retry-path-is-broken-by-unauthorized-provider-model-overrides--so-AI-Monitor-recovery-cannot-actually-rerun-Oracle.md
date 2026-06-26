---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Oracle retry path is broken by unauthorized provider/model overrides, so AI Monitor recovery cannot actually rerun Oracle
---

# Oracle Proposal
**Mission:** guard
**Level:** critical
**Title:** Oracle retry path is broken by unauthorized provider/model overrides, so AI Monitor recovery cannot actually rerun Oracle

## Evidence
```json
{
  "oracle_log": "/tmp/oracle.log: GPT-5.5 CLI failed: GatewayClientRequestError: provider/model overrides are not authorized for this caller",
  "monitor_log": "/tmp/cron-ai-monitor.log repeatedly says Oracle retry triggered — GPT-5.5 recovered",
  "impact": "Oracle last_run had findings_count=0/tools_used=0/runtime_sec=691, and retry mode cannot complete under current auth"
}
```

## Recommended Action
Align Oracle's model override with the caller's authorized gateway policy or remove the override; make AI Monitor verify Oracle exit success before clearing/retrying recovery.
