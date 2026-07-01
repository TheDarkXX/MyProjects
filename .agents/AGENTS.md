# General Behaviors

- **Workspace Priority**: When executing commands (especially `git push`, `git pull`, or file searches), always prioritize the main workspace folder (Main Folder) opened in AG over the directory of the currently active document. The active document might be a file opened from outside the current workspace, so its path should not override the main workspace context unless explicitly requested by the user.
