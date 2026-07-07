import json

# transcript text with times
with open('C:/Users/Admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/Test Auto/transcript.json', 'r', encoding='utf-8') as f:
    d = json.load(f)
words = d['words']

def get_dur(start_t, end_t):
    return end_t - start_t

def round_dur(d):
    return round(d, 2)

# --- Rough Cut (Base Cuts) ---
# Same cuts as before
rough_cut = [
    {"action": "cut", "start": 0.56, "end": 5.48, "reason": "พูดซ้ำ hook เดิม 2 รอบ"},
    {"action": "cut", "start": 15.82, "end": 16.3, "reason": "โอเค ไม่จำเป็น"},
    {"action": "cut", "start": 23.28, "end": 25.22, "reason": "โอเค + หนึ่ง ซ้ำ ตัดรอบแรก"},
    {"action": "cut", "start": 25.24, "end": 25.46, "reason": "หนึ่ง ซ้ำรอบสอง"},
    {"action": "cut", "start": 27.1, "end": 37.38, "reason": "พูดพล่ามผิด/ซ้ำ 3 รอบก่อนเทคดี"},
    {"action": "cut", "start": 42.34, "end": 43.78, "reason": "ติดอ่าง (สูงมากๆช่--)"},
    {"action": "cut", "start": 43.78, "end": 50.5, "reason": "พูดซ้ำ 3 รอบ"},
    {"action": "cut", "start": 55.7, "end": 58.26, "reason": "พูดซ้ำก่อนเทคดี (สอง ชาเขียว สอง)"},
    {"action": "cut", "start": 60.68, "end": 65.9, "reason": "พูดซ้ำ EGCG + ช่วยลด"},
    {"action": "cut", "start": 68.28, "end": 70.74, "reason": "พูดซ้ำ (ซึ่งมีงานวิจัยพบว่าเมื่อ)"},
    {"action": "cut", "start": 96.98, "end": 98.22, "reason": "พูดซ้ำ (และมีสารสำคัญ)"},
    {"action": "cut", "start": 101.34, "end": 104.58, "reason": "พูดซ้ำ (ซึ่งงานวิจัยพบว่าช่วยลดการอักเสบ)"},
    {"action": "cut", "start": 110.9, "end": 111.58, "reason": "พูดซ้ำ (และลด)"},
    {"action": "cut", "start": 120.76, "end": 124.26, "reason": "พูดซ้ำ (คะน้า คะน้า เช่น)"},
    {"action": "cut", "start": 128.06, "end": 131.82, "reason": "พูดผิด (ช่วยลดความเสี่ยงจากไขมันพอกตับที่ไม่ใช่)"},
    {"action": "cut", "start": 138.5, "end": 145.74, "reason": "พูดซ้ำ (ช่วยกระตุ้นเอนไซม์ดีท็อก)"},
    {"action": "cut", "start": 172.6, "end": 175.16, "reason": "พูดซ้ำ (ซึ่งมีงานวิจัยในสัตว์ทดลอง)"},
    {"action": "cut", "start": 183.3, "end": 188.82, "reason": "พูดซ้ำ (มีเนื้องอกในตับ...)"},
    {"action": "cut", "start": 193.42, "end": 195.86, "reason": "พูดซ้ำ (มีงานวิจัยปี)"},
    {"action": "cut", "start": 196.68, "end": 199.8, "reason": "พูดซ้ำ (พบว่าน้ำมัน น้ำมัน)"},
    {"action": "cut", "start": 204.66, "end": 207.62, "reason": "พูดซ้ำ (ได้ถึงหกสิบเปอร์เซ็นต์)"},
    {"action": "cut", "start": 224.14, "end": 234.04, "reason": "พูดติดขัด/ซ้ำ"},
    {"action": "cut", "start": 235.52, "end": 240.02, "reason": "พูดซ้ำ (ลดการอักเสบ...)"},
    {"action": "cut", "start": 243.48, "end": 248.46, "reason": "พูดซ้ำ (ซึ่งงานวิจัยปี 2021...)"},
    {"action": "cut", "start": 259.399, "end": 268.42, "reason": "พูดซ้ำ (ดังนั้นตับเป็นอวัยวะ) 4 รอบ"},
    {"action": "cut", "start": 280.52, "end": 289.56, "reason": "พูดซ้ำ (ดังนั้นควรดูแล/อย่าลืมดูแลตับ)"},
    {"action": "cut", "start": 291.82, "end": 294.45, "reason": "พูดซ้ำ (แล้วเพื่อนๆล่ะครับตอนนี้ค่าตับ)"},
    {"action": "speed", "start": 5.5, "end": 13.44, "speed": 1.2, "reason": "Hook ตอนต้นพูดช้าเกินไป"},
    {"action": "speed", "start": 303.18, "end": 305.34, "speed": 1.3, "reason": "สโลแกนจบพูดช้า เร่งให้กระชับ"}
]

# Total cut duration
cut_dur = sum(x['end'] - x['start'] for x in rough_cut if x['action'] == 'cut')
orig_dur = 305.34

# --- 1. keypoint_cut_plan (90-180s) ---
# Keep all foods with some details
kp_plan = [
    {"start": 5.5, "end": 15.8, "note": "Hook: ปัญหาตับพัง รีบฟัง"},
    {"start": 17.52, "end": 22.86, "note": "Intro: มีงานวิจัย"},
    {"start": 25.64, "end": 26.24, "note": "1. กาแฟดำ"},
    {"start": 37.38, "end": 41.63, "note": "ลดตุยเย่ 70%"},
    {"start": 51.64, "end": 54.52, "note": "ลดเสี่ยงมะเร็งตับ"},
    {"start": 58.32, "end": 60.62, "note": "2. ชาเขียว"},
    {"start": 70.74, "end": 84.02, "note": "งานวิจัย 12 สัปดาห์ ลด ALT AST"},
    {"start": 85.46, "end": 96.44, "note": "3. ปลาไขมันดี โอเมก้าสาม"},
    {"start": 104.58, "end": 110.02, "note": "ลดอักเสบ 30-40%"},
    {"start": 117.06, "end": 120.0, "note": "4. ผักใบเขียว"},
    {"start": 131.82, "end": 137.52, "note": "ลดเสี่ยงไขมันพอกตับ"},
    {"start": 145.74, "end": 154.88, "note": "กระตุ้นเอนไซม์ดีท็อก"},
    {"start": 154.96, "end": 161.3, "note": "5. ผักกะหล่ำ"},
    {"start": 162.84, "end": 171.87, "note": "มีกลูโคซิโนเลต ล้างพิษ"},
    {"start": 190.32, "end": 191.78, "note": "6. อะโวคาโด"},
    {"start": 199.8, "end": 213.96, "note": "ลดอักเสบ 60% ลดพังผืด"},
    {"start": 215.96, "end": 223.38, "note": "7. เบอร์รี่"},
    {"start": 248.46, "end": 257.94, "note": "ลดรุนแรงไขมันพอกตับ"},
    {"start": 268.42, "end": 279.44, "note": "สรุป: ตับช่วยระบบ 50 อย่าง"},
    {"start": 289.56, "end": 302.4, "note": "CTA + สโลแกน"}
]

# --- 2. essential_keypoint_cut_plan (60-90s) ---
# Strictly keep it under 90s, absolute bare minimum for the 7 points
ess_plan = [
    {"start": 5.5, "end": 15.8, "note": "Hook"},
    {"start": 25.64, "end": 26.24, "note": "1. กาแฟดำ"},
    {"start": 37.38, "end": 41.63, "note": "ลดตุยเย่ 70%"},
    {"start": 58.32, "end": 60.62, "note": "2. ชาเขียว"},
    {"start": 76.76, "end": 84.02, "note": "ลด ALT AST"},
    {"start": 85.46, "end": 87.3, "note": "3. ปลาไขมันดี"},
    {"start": 104.58, "end": 110.02, "note": "ลดอักเสบ"},
    {"start": 117.06, "end": 118.66, "note": "4. ผักใบเขียว"},
    {"start": 145.74, "end": 154.88, "note": "ดีท็อกตับ"},
    {"start": 154.96, "end": 156.6, "note": "5. ผักกะหล่ำ"},
    {"start": 162.84, "end": 171.87, "note": "ล้างพิษ"},
    {"start": 190.32, "end": 191.78, "note": "6. อะโวคาโด"},
    {"start": 199.8, "end": 204.36, "note": "ลดอักเสบ 60%"},
    {"start": 215.96, "end": 218.86, "note": "7. เบอร์รี่"},
    {"start": 248.46, "end": 257.94, "note": "ลดไขมันพอกตับ"},
    {"start": 289.56, "end": 301.1, "note": "CTA"}
]

# --- 3. viral_highlight_cut_plan (Shortest) ---
# Just the Hook + The most shocking fact (Coffee reducing death by 70%) + CTA
viral_plan = [
    {"start": 5.5, "end": 15.8, "note": "Hook: ปัญหาตับพัง รีบฟังด่วน"},
    {"start": 25.64, "end": 26.24, "note": "หนึ่ง กาแฟดำ"},
    {"start": 27.1, "end": 32.94, "note": "วันละ 2-4 แก้ว..."},
    {"start": 37.38, "end": 41.63, "note": "ลดเสียชีวิต 70%"},
    {"start": 289.56, "end": 302.4, "note": "CTA อย่าลืมดูแลตับ ทักหมอ"}
]

out = {
    "rough_cut": rough_cut,
    "keypoint_cut_plan": kp_plan,
    "essential_keypoint_cut_plan": ess_plan,
    "viral_highlight_cut_plan": viral_plan,
    "turning_point": 17.52,
    "summary": "คลิปแนะนำ 7 อาหารบำรุงตับที่มีงานวิจัยรองรับ เหมาะกับคนเป็นไขมันพอกตับ",
    "report": {
        "cuts_total": len([x for x in rough_cut if x['action'] == 'cut']),
        "cut_duration_sec": round_dur(cut_dur),
        "original_duration_sec": round_dur(orig_dur),
        "estimated_duration_after_cuts_sec": round_dur(orig_dur - cut_dur),
        "keypoint_plan_duration_sec": round_dur(sum(x['end']-x['start'] for x in kp_plan)),
        "essential_keypoint_plan_duration_sec": round_dur(sum(x['end']-x['start'] for x in ess_plan)),
        "viral_highlight_plan_duration_sec": round_dur(sum(x['end']-x['start'] for x in viral_plan))
    }
}

with open('C:/Users/Admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/Test Auto/editorial_decisions.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("Report Data:")
print(json.dumps(out["report"], indent=2))
