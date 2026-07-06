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
The tool must display a responsive grid gallery of all assets with a professional left-sidebar for filtering.

UI & Functional Requirements:

1. Comprehensive Filter Panel (Sidebar):
Include the following native filters:
- Type: Images, Videos, Collections, Scenes, Characters
- Aspect Ratio: Landscape, Portrait, Freeform
- Created: Generated, Uploaded, Favorites
- Duration: 4s, 6s, 8s, 10s

2. Pro-Level Enhancements (MUST HAVE):
- Live Search Bar: A search input that filters assets by matching text within the asset's FULL prompt. (e.g. typing "[S01]" shows only assets generated with that prefix).
- Selection Mode: Checkboxes on each thumbnail so users can select specific multiple assets, not just "Download All".

3. Advanced Sorting Controls:
Provide a sorting dropdown:
- Newest first
- Oldest first
- Name (A-Z)
- Name (Z-A)
CRITICAL: When sorting by "Name", the tool MUST use the full, uncut generation prompt text of the asset as the primary sorting key, ensuring prefixes like "[S01]" order correctly.

4. Bulk Download System:
Include a top action bar for batch operations:
- "Download Selected"
- "Download All (Matching Filters)"
- "Download Images Only" 
- "Download Videos Only"

5. CRITICAL - Smart File Naming (Full Prompt Extraction):
When downloading any asset, you MUST NOT use the default truncated short title. You MUST extract the exact full text of the original prompt used to generate the media. Use this full prompt text as the downloaded filename (sanitize invalid characters like \ / : * ? " < > | with underscores). This is the most important feature.
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
