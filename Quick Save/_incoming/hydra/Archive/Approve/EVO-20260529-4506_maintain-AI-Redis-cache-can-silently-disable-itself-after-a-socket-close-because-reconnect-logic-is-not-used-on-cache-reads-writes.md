---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-29
brain_task_id: ~
source: oracle
proposal_id: EVO-20260529-4506
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: AI Redis cache can silently disable itself after a socket close because reconnect logic is not used on cache reads/writes
---

# Oracle Proposal (EVO-20260529-4506)
**Mission:** maintain
**Level:** optimization
**Title:** AI Redis cache can silently disable itself after a socket close because reconnect logic is not used on cache reads/writes

## Evidence
```json
{
  "delta_observed": "brain-app error log now includes repeated `[RedisCache] Redis client error: Socket closed unexpectedly` followed by multiple blank Redis client errors after the latest deploy wave.",
  "ops_context": "Recent restarts align with deploy-hook events at 2026-05-29 04:16:01 and 05:04:22, so this is not diagnosed from PM2 restart counts.",
  "code_path": "/root/brain-app/lib/ai-call.js exports a singleton RedisCache; its error handler sets `this.connected = false`, but `get()` and `set()` immediately return when `!this.connected || !this.client` instead of calling the existing `checkConnection()` / `_connectWithRetry()` path.",
  "impact": "Once Redis closes the socket, AI response caching degrades to permanent no-cache behavior for that process lifetime, increasing duplicate AI gateway calls and latency while only emitting noisy logs."
}
```

## Recommended Action
Wire RedisCache.get/set through a guarded reconnect path: if disconnected, attempt `checkConnection()` once with cooldown/backoff before returning null/no-op; also suppress empty Redis error logs by printing a stable code/message and avoid spawning repeated clients during outages.
