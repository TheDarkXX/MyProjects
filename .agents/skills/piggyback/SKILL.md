---
name: piggyback
description: "Migrated piggyback skill"
---
# ๐“ฆ Skill / Design Pattern: `/piggyback`

## Objective
To seamlessly bridge background VPS agents (like Evolver, Ideator, automated scrapers) with the local Antigravity (AG) workspace without relying on complex webhooks or websockets.

## The Protocol

When a background process on the VPS discovers an item requiring human review or AG implementation, it MUST NOT just silently log or solely notify Discord. It MUST use the **Piggyback Pattern**:

1. **Format as YAML/Markdown:** 
   The script creates a well-formed Markdown file complying exactly with the `Quick Save` YAML Frontmatter standard.
   - Status: tracking (`incoming` or `active`)
   - Tags: `[auto-generated, manual-review]`

2. **Deposit in Inbox:**
   The output is saved natively into the Git-tracked inbox directory based on source:
   - Hydra: `[ROOT_DIR]/Quick Save/_incoming/hydra/EVO_<id>_<slug>.md`
   - Dev Agent (Discord): `[ROOT_DIR]/Quick Save/_incoming/dev-agent/_STUB_<slug>.md`

3. **Quiet Auto-Commit:**
   The process instantly executes a targeted Git commit:
   `git add "Quick Save/_incoming/"`
   `git commit -m "auto: piggyback new high risk proposal"`

4. **Frictionless Handoff:**
   - Because the VPS commit advanced the `master` tree, any future attempt by AG to run `/save` and `git push vps` locally **WILL BE REJECTED**.
   - The upgraded `/save` skill handles this by always running `git pull vps master --no-rebase` first.
   - This intrinsically "pulls down" the inbox files directly into the local VS Code workspace right before pushing the new code, effectively handing off the background tasks natively.

## Implementation Standard for Scripts
```javascript
// Excerpt for Node.js Scripts:
const md = `---
version: "N/A"
type: impl
status: incoming
outcome: pending
summary: Auto-generated from VPS background job
---
...details...
`;
fs.writeFileSync('Quick Save/_incoming/NEW_TASK.md', md);
execSync('git add "Quick Save/_incoming/"');
execSync('git commit -m "auto: piggyback task"');
```
