---
name: codex
description: "Migrated codex skill"
---
# ๐ง  Skill: `/codex`

## Objective
To seamlessly connect and authenticate the system with Hermes Codex OAuth using Device Auth mode. The Access Token natively expires exactly **10 days** after login, meaning this skill must be executed periodically whenever the token drops (until an automated refresh watcher is built).

## Execution Steps

1. **Initiate Device Login:**
   - Execute the command: `ssh root@185.250.38.247 "codex login --device-auth"`
   - The CLI will output a Device Login URL and a Code.

2. **User Action:**
   - Provide the authentication instructions to the user clearly in the chat:
     > เน€เธเธดเธ”เน€เธเธฃเธฒเธงเนเน€เธเธญเธฃเนเนเธเธ—เธตเนเธฅเธดเธเธเนเธเธตเน: [URL]
     > เธเธฃเธญเธ Code เธเธตเน: [CODE] (เธฅเนเธญเธเธญเธดเธเธ”เนเธงเธข account darkxzdragon@gmail.com)
   - Do NOT ask the user to paste any localhost URLs back. Wait for them to confirm they have completed the login on their browser.

3. **Verification:**
   - Once the user confirms, the CLI process on the VPS should have automatically completed and updated `/root/.codex/auth.json`.
   - Run a quick curl test through the `ai-gateway.js` to ensure the new token is working:
     `ssh root@185.250.38.247 "curl -H 'x-agent-id: antigravity' -H 'Content-Type: application/json' -d '{\"model\":\"gpt-5.5\",\"messages\":[{\"role\":\"user\",\"content\":\"Ping\"}]}' http://localhost:18810/openai/v1/chat/completions"`
   - Confirm to the user that the connection is active and state that it will last for the next 10 days.

4. **Logging:**
   - On success, append a log entry into `docs/skills/codex-login.log` in the local repo with the current Date and Time. Format: `[YYYY-MM-DD HH:mm:ss] Hermes Codex successfully connected.`
   - Ensure you commit and push this log to the VPS to maintain the historical record.
