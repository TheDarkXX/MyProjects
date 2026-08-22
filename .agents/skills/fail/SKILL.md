---
name: fail
description: "Migrated fail skill"
---
# ๐“ Skill: `/fail` (or `/bug`)

## Objective
Immediately ingest a user's failure complaint or bug report, parse the context natively, and seamlessly inject it into the mandatory `skill-fail` JSONL format inside `self-improving/skill-emit.jsonl` without requiring tedious manual JSON constructions.

## Execution Steps
1. **Context Extraction:** 
   - Process the text following the `/fail <skill_id> <complaint/analysis>` command.
   - Summarize the complaint logically into three fields (under 500 chars each): `what_failed`, `root_cause`, and `fix` (or expected alternative).
2. **System Metadata Fetching:** 
   - Generate the current real-time ISO Timestamp (`ts`).
   - Retrieve the current active `conversation-id` directly from the system metadata prompt.
3. **Stringify JSON Output:** 
   - Build a robust one-line JSON object strictly matching the Iron Rule schema: 
     `{"ts":"...","type":"skill-fail","conv":"...","skill_id":"...","what_failed":"...","root_cause":"...","fix":"..."}`
4. **Knowledge Base Append:** 
   - Safely append the generated JSON line to `self-improving/skill-emit.jsonl` ensuring newline separation and zero escaping corruption.
5. **Report:** 
   - Notify the user that the failure has been permanently cemented into the AI's long-term avoidance protocols.
