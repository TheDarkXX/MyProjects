---
description: Run Gemini Flash 3.8 Sub-Agent Worker to generate code or execute tasks with zero Claude token burn
---

Execute the user's task using the Gemini Flash Sub-Agent Worker to preserve Claude Pro quota.

Task from user: $ARGUMENTS

### Instructions:
1. If the user asks to write, edit, or refactor a file:
   Run the worker via terminal:
   `node tools/flash-worker.js --code -p "$ARGUMENTS" -o "<destination_file>"`
   Or if modifying an existing file:
   `node tools/flash-worker.js --code -f "<source_file>" -p "$ARGUMENTS" -o "<destination_file>"`

2. If the user provides a direct question or prompt:
   Run:
   `node tools/flash-worker.js "$ARGUMENTS"`

3. Verify the generated file or output (The Gate Function), check syntax/tests, and present the final status to the user.
