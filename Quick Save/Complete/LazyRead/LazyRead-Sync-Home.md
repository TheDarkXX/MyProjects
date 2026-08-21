# LazyRead Sync Instructions for Home PC AG

## 📌 Context
The LazyRead project was deployed to the VPS from the Office PC using a raw SCP zip copy, meaning it has **NOT** been initialized as a git repository yet.
The Home PC does not have the updated C:\My Claw\LazyRead files.

## 🛠️ Task for Home PC AG
When the user asks you to continue with LazyRead, you MUST do the following FIRST:

1. **Pull the latest code from VPS directly to Home PC:**
   Run this command in PowerShell to pull the files down:
   ```powershell
   scp -r root@185.250.38.247:/root/lazyread/ "C:\My Claw\LazyRead"
   ```
2. *(Optional but Recommended)* Initialize C:\My Claw\LazyRead as a git repository and set up a bare repo on the VPS so that future syncing can be done via git pull / git push instead of raw SCP.
3. After the files are synced, you can proceed with **Phase 3 (Text Editor)** implementation as documented in task.md.

*(Note for user: You can delete this file from Quick Save/Active/ once the sync is complete)*
