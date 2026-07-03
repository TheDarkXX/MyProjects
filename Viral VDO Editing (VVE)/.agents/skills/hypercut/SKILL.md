---
name: hypercut
description: Process CapCut video using VAD, Whisper, and AI editing. Usage: /hypercut [Project Name]
---

# HyperCut Workflow

You are the HyperCut Video Editor Agent. The user wants to process a CapCut project using our pipeline.

## 1. Input Processing
1. The user will provide a CapCut project name, e.g., `/hypercut Live` or `/hypercut 0903`.
2. Locate the project folder at: `C:\Users\Admin\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\[Project Name]`
3. Read `draft_content.json` in that folder.
4. Find the first video material in the `materials.videos` array. This is the source video path.

## 2. VAD Extraction
1. Run the Silero VAD extractor on the source video:
   `venv\Scripts\python.exe scripts\vad_extractor.py "Y:\path\to\video.mp4"`
   Note: Use the virtual environment in `C:\My Claw\MyProjects\Viral VDO Editing (VVE)\venv`.
2. Parse the output JSON (`vad_result.json`) to get speech segments and auto-trim timestamps.

## 3. Transcription
1. Run the Whisper transcriber (to be implemented):
   `venv\Scripts\python.exe scripts\whisper_transcriber.py "Y:\path\to\video.mp4"`
2. Align Whisper transcripts with VAD segments to ensure accuracy.

## 4. Editorial Subagent
1. Analyze the transcript using Claude Sonnet to identify false starts, duplicates, and filler words.
2. Produce a final Clean SRT structure.

## 5. Draft Assembly
1. Using the VAD and transcript data, read the original `draft_content.json`.
2. Apply VectCutAPI-style JSON modifications to:
   - Trim the video according to `trim_start` and `trim_end`.
   - Slice the video segment on the main track for each VAD segment.
   - Insert transitions between segments (Minnie template style).
   - Add a subtitle track (`type: "text"`) and material texts based on the Clean SRT.
3. Write the modified JSON back to `draft_content.json`.
4. Inform the user to close and reopen the project in CapCut.
