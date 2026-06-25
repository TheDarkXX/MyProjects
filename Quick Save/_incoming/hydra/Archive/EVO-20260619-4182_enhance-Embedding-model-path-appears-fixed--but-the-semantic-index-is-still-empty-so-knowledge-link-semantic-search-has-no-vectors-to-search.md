---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-06-19
brain_task_id: ~
source: oracle
proposal_id: EVO-20260619-4182
tags: [oracle, enhance, optimization]
summary: >
  Oracle optimization finding: Embedding model path appears fixed, but the semantic index is still empty so knowledge-link semantic search has no vectors to search
---

# Oracle Proposal (EVO-20260619-4182)
**Mission:** enhance
**Level:** optimization
**Title:** Embedding model path appears fixed, but the semantic index is still empty so knowledge-link semantic search has no vectors to search

## Evidence
```json
{
  "routes_file": "/root/brain-app/routes/links.js defines /api/links/embed, /api/links/embed-all, and /api/links/semantic-search using the embeddings table",
  "embedding_model_default": "getEmbedding now defaults to process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2'",
  "pm2_env": "brain-app PM2 environment does not show GEMINI_EMBEDDING_MODEL overriding the default",
  "db_embedding_count": "SELECT COUNT(*) FROM embeddings WHERE embedding IS NOT NULL AND embedding != '' returned total=0",
  "db_embedding_dims": "min_dim/max_dim/dims all null; no usable vectors exist"
}
```

## Recommended Action
After confirming gemini-embedding-2 returns embeddings through the local google proxy, run a controlled /api/links/embed-all backfill or background worker job, then add a lightweight semantic-index health metric showing embedded/total note counts so future model fixes do not leave search silently empty.
