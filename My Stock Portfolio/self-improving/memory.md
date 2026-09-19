# Project Memory

This file automatically stores extracted rules and context for this specific project.

## General Rules
- **Mandatory Instant Auto-Deploy Pipeline:** Whenever any code is modified in `My Stock Portfolio`, you MUST immediately execute the full deploy pipeline in the same turn without waiting for user commands: `npm run build` -> `node bump-cache.js` -> `git commit & push origin master` -> `scp -r dist/* root@185.250.38.247:/root/stock-portfolio/dist/` -> `ssh root@185.250.38.247 "pm2 reload stock-api"`.
