---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-13
brain_task_id: ~
source: oracle
proposal_id: EVO-20260613-1975
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Knowledge-link embedding endpoints are broken by a retired Gemini embedding model target
---

# Oracle Proposal (EVO-20260613-1975)
**Mission:** maintain
**Level:** critical
**Title:** Knowledge-link embedding endpoints are broken by a retired Gemini embedding model target

## Evidence
```json
{
  "log_error": "POST /api/links/embed returned an error: models/text-embedding-004 is not found for API version v1beta, or is not supported for embedContent",
  "stack": "getEmbedding at /root/brain-app/routes/links.js:35, called by /root/brain-app/routes/links.js:159",
  "code_path": "routes/links.js hard-codes http://127.0.0.1:18810/google/v1beta/models/text-embedding-004:embedContent?key=... for /api/links/embed, /api/links/embed-all, and /api/links/semantic-search",
  "impact": "Notes semantic search / related-link embedding cannot generate fresh vectors; /embed-all catches per-note failures but will silently produce 0 new embeddings, while /embed and semantic-search can surface 500s to the UI.",
  "not_duplicate_of_memory": "Existing provider-chain findings cover user-facing AI chat/image fallback outages; this is a separate knowledge-link embedding route with a hard-coded unsupported embedding model."
}
```

## Recommended Action
Update routes/links.js to use a currently supported Gemini embedding model/method exposed by the local Google proxy, centralize the embedding model name in config, and make /api/links/embed plus semantic-search return a clear 503 with provider/model diagnostics when embedding is unavailable instead of throwing an unclassified server error.
