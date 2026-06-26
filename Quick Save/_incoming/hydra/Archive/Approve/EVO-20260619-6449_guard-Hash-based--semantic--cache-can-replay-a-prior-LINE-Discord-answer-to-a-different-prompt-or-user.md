---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-06-19
brain_task_id: ~
source: oracle
proposal_id: EVO-20260619-6449
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Hash-based “semantic” cache can replay a prior LINE/Discord answer to a different prompt or user
---

# Oracle Proposal (EVO-20260619-6449)
**Mission:** guard
**Level:** critical
**Title:** Hash-based “semantic” cache can replay a prior LINE/Discord answer to a different prompt or user

## Evidence
```json
{
  "new_runtime_evidence": "brain-app out log now shows `[ai][semantic-cache] HIT! similarity=0.963` during live LINE webhook handling, immediately before replying to `line_group_C7396351f2b37313ae08c045913000cab`.",
  "code_evidence": "`discord-bot/lib/ai.js` implements semantic cache with only 9 pseudo-embedding dimensions derived from SHA-256 bytes (`computePromptHash`) and accepts any cosine similarity above 0.95; this is not semantic similarity and can collide on unrelated prompts.",
  "privacy_impact": "The cache stores full model responses for one hour in a process-global Map, while LINE prompts include user/group identity, Brain DB context, finance/memory context, and conversational content; a false-positive hit can return a stale or private answer without calling the model.",
  "not_duplicate_of_memory": "This is distinct from the rejected `AI cache hashing path can crash requests after the xxhash migration` and the deployed Redis reconnect issue; the new issue is incorrect cross-prompt response reuse caused by the pseudo-semantic cache design and is evidenced by live cache hits."
}
```

## Recommended Action
Disable semantic-cache reads for LINE/Discord conversational chat, or scope cache keys by agent+channel/session+normalized prompt and require exact prompt hash for sensitive contexts. If semantic reuse is desired, replace the SHA-byte pseudo-vector with real embeddings and add a high-confidence guard that never reuses responses containing Brain DB, finance, memory, or user-specific context.
