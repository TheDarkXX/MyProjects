---
name: posttest
description: "Migrated posttest skill"
---
# ๐งช Skill: `/posttest` (Post-Implementation Test)

## Objective
Perform a full end-to-end (E2E) functional integration test of recently implemented features, agents, or bots. Ensure they securely execute data flows from start to finish and output real, tangible results correctly.

## Execution Steps
1. **Identify the Flow:** Review the logic architecture of the newly created feature/agent. Identify its triggers and the exact expected output location (e.g. database, Discord, JSON structure, or API response).
2. **Execute Functional Trigger:** Proceed to actively trigger the workflow as a real user or system would (e.g. simulating the cron job, sending a mock API payload, or calling the discord bot command).
3. **Verify Pipeline State:** Ensure the data propagates cleanly through internal pathways without blockages, parsing errors, or missing context.
4. **Validate Downstream Results:** Physically check that the final outcome was generated correctly (e.g. valid DB entry, message delivered, correct JSON validation).
5. **Report to User:** Guarantee that the integration is fully functional in real usage logic and report the captured output back to the user.
