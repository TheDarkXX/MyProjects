---
version: "draft"
type: study
status: icebox
outcome: deferred
date: 2026-06-14
brain_task_id: ~
source: oracle
proposal_id: EVO-20260610-3409
tags: [oracle, guard, critical, hermes, dashboard, security]
conversation: "0c354422-1811-4b46-b8b1-d1ce3ebc41b6"
conversation_title: "Hydra EVO Batch Review 2026-06-14"
related_plans_same_conversation:
  - "V12.19.2_[hotfix]_links_gemini-embedding-model-swap.md"
  - "V12.19.3_[hotfix]_line_hermes-webhook-credentials.md"
  - "V12.19.4_[hotfix]_cache_redis-reconnect-on-read-write.md"
  - "EVO-20260612-8055_[study]_downloader_stream-double-close (Icebox)"
related:
  - docs/skills/evo.md
summary: >
  Hermes dashboard is running with --insecure --host 0.0.0.0 on port 9119, exposing an
  unauthenticated debug dashboard to all network interfaces. Fix is trivial (change to
  127.0.0.1) but urgency is low — firewall likely blocks external access. Iceboxed for
  next infra maintenance sweep.
---

# EVO-20260610-3409 — Hermes Dashboard Insecure Binding (ICEBOXED)

## 📌 Context (Compiled Truth)

### Why Iceboxed
- Valid security concern but no evidence of active exploitation
- Firewall likely blocks port 9119 externally
- Fix is a one-line PM2 config change (`--host 0.0.0.0` → `--host 127.0.0.1`)
- Not worth a version bump alone — bundle with next infra sweep

### Star Scores
| Dimension | Score |
|---|---|
| 🚀 Impact | ⭐⭐⭐ |
| ⚙️ Feasibility | ⭐⭐⭐⭐ |
| ⏱️ Urgency | ⭐⭐ |
| 🎯 Alignment | ⭐⭐ |
| **Overall** | **2.75 / 5** |

## 📦 RAW ARTIFACT BACKUP (Iron Rule)

<details>
<summary>Original EVO Proposal (EVO-20260610-3409)</summary>

```
# Oracle Proposal (EVO-20260610-3409)
**Mission:** guard
**Level:** critical
**Title:** Hermes dashboard is running in insecure mode on all network interfaces

## Evidence
{
  "process": "hermes-dashboard",
  "pm2_exec_path": "/usr/bin/bash",
  "pm2_args": "hermes dashboard --no-open --insecure --host 0.0.0.0 --port 9119",
  "status": "online",
  "memory": "218935296 bytes",
  "why_new": "This is distinct from the previously rejected PM2 environment-secret exposure finding; the risk is an actively exposed unauthenticated/insecure dashboard listener."
}

## Recommended Action
Move Hermes dashboard behind localhost-only binding or an authenticated reverse proxy: change host from 0.0.0.0 to 127.0.0.1, remove --insecure where possible, and allow access only via SSH tunnel/VPN or a firewall-restricted authenticated proxy.
```

</details>

## 🔗 GBRAIN Backlinks

### related_to
- **2026-06-14** | [V12.10.0 — Hermes Codex OAuth Migration](../Active/V12.10.0_[impl]_infra_hermes-codex-oauth-migration.md) -- Hermes infrastructure
