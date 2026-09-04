# Lessons Learned & Corrections

- **Object Shorthand Variable Mismatch**: When creating object literals (e.g. `{ targetVal }`), always verify that the declared variable name matches (`const targetVal = ...` not `const tgtVal = ...`). Because `vite build` uses esbuild without type-checking, always run `npx tsc --noEmit` to catch runtime ReferenceErrors before deployment.
