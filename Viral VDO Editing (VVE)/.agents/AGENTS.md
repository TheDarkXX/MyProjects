# Project Rules for Viral VDO Editing (VVE)

## Pipeline Execution Rules
1. **Never auto-run billable scripts lulled by confidence**: Do NOT automatically run `03-transcribe.py` (or other scripts that consume paid API credits like ElevenLabs or LLM processing) immediately after modifying earlier pipeline steps (like `01b-silence-cut.py`) UNLESS the user explicitly gives permission.
2. **Wait for user confirmation**: When tweaking cuts or parameters, always STOP and wait for the user to review the CapCut timeline before proceeding to the transcription or editorial steps. Do not assume the edit is "perfect" and run the rest of the pipeline to save time, as it wastes credits if the cut needs further tuning.

## Quality Assurance Rules
3. **AI Double Recheck (Text Verification)**: When verifying the final script or timeline text, you MUST manually read through the generated output multiple times (Double Recheck). You must actively hunt for:
   - Repeated words (คำซ้ำ)
   - Extra words (คำเกิน)
   - Missing words (คำหาย)
   - Chopped/Fragmented words (คำแหว่ง)
   NEVER assume your automated cut logic worked perfectly. You must thoroughly re-read the final text to catch any missed stutters or semantic breaks before presenting the result to the user.
