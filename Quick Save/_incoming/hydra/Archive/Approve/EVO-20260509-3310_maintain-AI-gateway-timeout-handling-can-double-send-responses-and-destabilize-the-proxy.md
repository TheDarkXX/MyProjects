---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-09
brain_task_id: ~
source: oracle
proposal_id: EVO-20260509-3310
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: AI gateway timeout handling can double-send responses and destabilize the proxy
---

# Oracle Proposal (EVO-20260509-3310)
**Mission:** maintain
**Level:** critical
**Title:** AI gateway timeout handling can double-send responses and destabilize the proxy

## Evidence
```json
{
  "pm2_delta": "ai-gateway increased to 42 restarts and PM2 shows a 2026-05-09T23:02:03 exit with code 1 via SIGINT, with no matching ops_events entry after 2026-05-08 18:17:30",
  "log_signature": "ai-gateway-error.log contains repeated `Error [ERR_HTTP_HEADERS_SENT]: Cannot write headers after they are sent to the client` following provider timeout/socket hang up paths",
  "code_path": "/root/brain-app/ai-gateway.js has proxyReq error and timeout handlers that both call res.writeHead/res.end without checking res.headersSent or using a single completion guard",
  "non_duplicate_scope": "This is not the known PM2 deploy-restart issue and not the pending usage.json temp-file race; it is a response lifecycle bug in ai-gateway request error handling."
}
```

## Recommended Action
Add a small `safeSendOnce(res, status, body)` or per-request `responded` guard around proxy error, timeout, and upstream response paths; on timeout destroy the upstream request only after marking the request handled, and skip writes when `res.headersSent || res.writableEnded` so provider flakiness cannot turn into gateway exceptions/restarts.
