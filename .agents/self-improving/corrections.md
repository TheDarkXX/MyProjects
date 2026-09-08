# Lessons Learned & Corrections

- **Object Shorthand Variable Mismatch**: When creating object literals (e.g. `{ targetVal }`), always verify that the declared variable name matches (`const targetVal = ...` not `const tgtVal = ...`). Because `vite build` uses esbuild without type-checking, always run `npx tsc --noEmit` to catch runtime ReferenceErrors before deployment.
- **Meaning of 'Push' (End-to-End Live Deployment)**: When the user says 'push' or commands a deploy, it NEVER means just a raw `git push` to Github. In this project, 'push' means the complete, non-negotiable live production pipeline:
  1. `npm run build`
  2. `node bump-cache.js`
  3. `scp -r dist/* root@185.250.38.247:/root/stock-portfolio/dist/` (and server files if changed)
  4. `ssh root@185.250.38.247 "pm2 reload stock-api"`
  5. `git push origin master`
  All 5 steps must be executed in a single shot without the user ever having to ask twice.
