# Corrections & Mistakes

- **2026-09-02 (Database Schema Mismatch):** When restoring legacy components, ensure foreign key checks use `portfolio_id` (matching SQLite schema) rather than camelCase `portfolioId`.
- **2026-09-02 (Historical Cache Boundary Check):** In `server/routes/historical.js`, checking `cached.length > 0` caused short cache ranges (e.g. 6M from Dashboard) to block larger ranges (e.g. 1Y from Performance). Always ensure `cached[0].date <= from` before declaring cache hit.
- **2026-09-02 (Deployment & PM2):** `My Stock Portfolio` is a hybrid app hosted on VPS `185.250.38.247`. Frontend is deployed via `scp dist/*` to `/root/stock-portfolio/dist/`. Backend is deployed to `/root/stock-portfolio/server/` and managed under PM2 process `stock-api`. Always run `pm2 save` after starting services.
- **2026-09-04 (ReferenceError in Object Shorthand & ErrorBoundary):** In `SmartRebalancePage.tsx`, declaring `const currVal = ...` while returning object shorthand `{ currentVal }` caused a runtime `ReferenceError: currentVal is not defined` when calculating deficits with live holdings. Always ensure object shorthand variables match declarations exactly. Wrap all lazy-loaded root modules in an `ErrorBoundary` in `App.tsx` to prevent component crashes from turning the entire app into a black screen.

