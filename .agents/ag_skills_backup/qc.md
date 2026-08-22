# 🧹 Skill: `/qc` (MyProjects — Focus Lock-aware)

## Objective
Quick Clear & organize for the currently focused project.

## Execution Steps
1. **Verify Focus Lock** → get `[ProjectName]`.
2. **Scan `Quick Save/Active/[ProjectName]/` for Ghosts:**
   - If file also in `Complete/[ProjectName]/` → delete from Active.
3. **Auto-Complete:**
   - Files with `status: complete` → move to `Quick Save/Complete/[ProjectName]/`.
   - Sync copy to `Openclaw-VPS/Quick Save/Complete/[ProjectName]/`.
4. **Report:** Show moved/deleted files with both local and Openclaw paths.
