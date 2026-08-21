---
name: webtest
description: "Migrated webtest skill"
---
# ๐ Skill: `/webtest`

## Objective
Launch the autonomous browser subagent to execute a full integration test on the live production frontend without tying up the preliminary recheck pipeline.

## Execution Steps
1. **Initialize Browser Subagent:** Automatically spin up the `browser_subagent` tool.
2. **Navigate strictly to Production:** Go to `https://brain.doctorbankonline.com`. (NEVER use localhost or direct IPs per the Iron Rule).
3. **Login:** Enter the password `doctorbank2026`.
4. **Smoke Test Execution:**
   - Wait for the UI elements to render.
   - Target and interact with the newly implemented pages, sections, or buttons specifically.
   - Assert visual stability and confirm that event bindings trigger correctly.
5. **Report Result:** Extract the DOM or wait for confirmation that the UI is stable, error-free, and interactive, then return the outcome.
