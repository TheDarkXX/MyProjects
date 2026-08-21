---
name: smartdl
description: "Migrated smartdl skill"
---
# ๐ง  Skill: `/smartdl`

## Objective
To generate a Chrome Extension boilerplate (Content Script + Background) designed to extract video URLs and text prompts from AI generation web UIs, ensuring they are downloaded simultaneously as a "Sidecar" pair (`.mp4` + `.txt`).

## Execution Steps

1. **Target Analysis:**
   - Ask the user to provide the target website's HTML snippet for the video card / prompt block.
   - Analyze the DOM structure to locate the video URL (`src`) and the prompt text (`innerText`).

2. **Extraction Logic (Content Script):**
   - Draft `content.js` to inject a "Smart Download" button into the DOM near each generated video.
   - When clicked, the script must traverse the DOM, extract the video URL and text prompt, and send a message to the Background Script.

3. **Download Pipeline (Background Script):**
   - Draft `background.js` leveraging `chrome.downloads.download()`.
   - The script must trigger the video download and simultaneously create a Blob for the text prompt, triggering a second download with the exact same base filename (Sidecar pair).

4. **Delivery:**
   - Provide the complete code for `manifest.json`, `content.js`, and `background.js` in a clear, copy-pasteable format.
   - Provide brief instructions on how the user can load this Unpacked Extension into Chrome.
