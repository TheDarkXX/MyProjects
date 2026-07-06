# Tool Prompt Template

## Tool Name
Smart Gallery Viewer

## Category
workflow

## Purpose
แอป Gallery Viewer สำหรับเปิดดูรูปและวิดีโอใน Workspace ของ Google Flow พร้อมระบบ Sorting ตามตัวอักษร และ Bulk Download ที่ใช้ Full Prompt เป็นชื่อไฟล์

## Prompt (English)
```
Create a custom "Smart Gallery Viewer" tool for managing, filtering, and exporting media assets generated in the current project workspace. 
The tool must display a responsive grid gallery of all assets. Please implement the following requirements, prioritizing Phase 1 over Phase 2.

### CRITICAL ARCHITECTURE & STATE MANAGEMENT
To prevent feature regressions when updating the tool, you MUST strictly isolate your state logic:
- Maintain an immutable `originalAssets` array. Never mutate the raw source data.
- Derive the `displayedAssets` array through a strict sequential pipeline: 1) Apply Filters -> 2) Apply Search -> 3) Apply Sorting.
- Keep the `selectedAssets` state (checkboxes) completely independent so that selections are NOT lost when a user changes a filter or sorting option.

### PHASE 1: CORE FUNCTIONALITIES (CRITICAL)

1. Asset Thumbnail Display (UI):
For each asset in the grid, DO NOT display the default generated short title. You MUST display the first 15 words of the asset's FULL prompt as its title/caption directly under the thumbnail.

2. Advanced Sorting Controls:
Provide a sorting dropdown: Newest first, Oldest first, Name (A-Z), Name (Z-A).
CRITICAL: When sorting by "Name", the tool MUST use the full, uncut generation prompt text of the asset as the primary sorting key.

3. Smart File Naming & Auto-Truncation (Download Logic):
When downloading any asset, you MUST extract the text of the original prompt used to generate the media to use as the filename. 
- Auto-truncate the filename to a maximum of 15 words (append "...").
- Sanitize the string (replace invalid filename characters with underscores).
- NEVER use the default Google Flow short title. The filename MUST start with the exact prefix from the user's prompt (e.g., "[S01]").

4. Basic Download System:
Allow users to download individual assets with the smart file naming applied.

### PHASE 2: ENHANCEMENTS & UI (OPTIONAL BUT RECOMMENDED)

5. Filter Panel (Sidebar):
Include native filters for Type (Images, Videos) and Created (Generated, Uploaded).

6. Selection & Bulk Download:
Include checkboxes on each thumbnail so users can select specific assets. Add a top action bar for: "Download Selected", "Download All", "Download Images Only", "Download Videos Only".

7. Live Search Bar:
A search input that filters assets by matching text within the asset's FULL prompt (e.g., typing "[S01]" shows only assets with that prefix).

### PHASE 3: ADVANCED VIEW CONTROLS (OPTIONAL)

8. View Options:
Include a view control panel mirroring the native interface:
- View Mode toggle: "Grid" or "Batch".
- Grid Size toggle: "S", "M", "L" (dynamically adjust the CSS grid columns/thumbnail sizes based on selection).
```

## Expected Input
- User selects the sorting method.
- User clicks bulk download buttons (All, Images, Videos).

## Expected Output
- Assets are downloaded to the user's computer using the exact full prompt text as the filename.
- Gallery is sorted correctly alphabetically based on the prompt prefixes.

## Iterations

### v1 — 2026-07-06
- Initial prompt focused on Sorting, Bulk Download, and Smart File Naming (Full Prompt).
- ผลลัพธ์: (รอทดสอบใน Google Flow)

## Screenshot
(ยังไม่มี รอทดสอบ)

## Notes
- จุดสำคัญที่สุดคือการบังคับให้ AI ของ Google Flow ดึง metadata ส่วนที่เป็น Full prompt มาทำเป็นชื่อไฟล์แทนชื่อย่อ
