# Auto-Extracted Rules & Preferences

- **Always Git Push**: Whenever code changes or tasks are completed, always commit and `git push origin master` from the workspace root (`c:\My Claw\MyProjects`). Never leave working tree uncommitted or unpushed unless explicitly told not to.
- **My Stock Portfolio VPS Deploy**: The user accesses My Stock Portfolio hosted on the VPS (`185.250.38.247`). Every time changes are made:
  1. `npm run build`
  2. `node bump-cache.js`
  3. `scp -r dist/* root@185.250.38.247:/root/stock-portfolio/dist/`
  4. `ssh root@185.250.38.247 "pm2 reload stock-api"`
  5. `git push origin master`
