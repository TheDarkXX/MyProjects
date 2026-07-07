# Project Rules for Viral VDO Editing (VVE)

## Pipeline Execution Rules
1. **Never auto-run billable scripts lulled by confidence**: Do NOT automatically run `03-transcribe.py` (or other scripts that consume paid API credits like ElevenLabs or LLM processing) immediately after modifying earlier pipeline steps (like `01b-silence-cut.py`) UNLESS the user explicitly gives permission.
2. **Wait for user confirmation**: When tweaking cuts or parameters, always STOP and wait for the user to review the CapCut timeline before proceeding to the transcription or editorial steps. Do not assume the edit is "perfect" and run the rest of the pipeline to save time, as it wastes credits if the cut needs further tuning.
