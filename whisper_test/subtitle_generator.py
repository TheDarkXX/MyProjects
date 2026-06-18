def format_time(seconds):
    """แปลงวินาทีแบบ float เป็นรูปแบบเวลาของ SRT (HH:MM:SS,mmm)"""
    ms = int(round((seconds % 1) * 1000))
    # Adjust for floating point rounding where ms might become 1000
    if ms >= 1000:
        seconds += 1
        ms -= 1000
        
    s = int(seconds)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def generate_srt(grouped_words, output_file, preset="flow"):
    """
    สร้างไฟล์ .srt จากคำที่จัดกลุ่มแล้วตาม Preset ต่างๆ
    - hormozi: 1 คำต่อซับเน้นๆ 
    - flow (default): 2-3 คำต่อซับ อ่านลื่นไหลสบายตา
    - classic: ประโยคยาว ไม่เกินบรรทัดละ 40 ตัวอักษร
    """
    
    if preset == "hormozi":
        max_words = 1
        max_chars = 15
        max_pause = 0.5
    elif preset == "classic":
        max_words = 10
        max_chars = 40
        max_pause = 0.8
    else: # "flow" preset
        max_words = 3
        max_chars = 15
        max_pause = 0.3

    chunks = []
    current_chunk = []
    
    for w in grouped_words:
        word_text = w["word"].strip()
        if not word_text:
            continue
            
        # กฎในการตัดบรรทัด (Chunking rules)
        if current_chunk:
            prev_w = current_chunk[-1]
            pause_duration = w["start"] - prev_w["end"]
            current_chars = sum(len(cw["word"]) for cw in current_chunk)
            
            # 1. จำนวนคำเกินโควต้า?
            # 2. จำนวนตัวอักษรเกินหน้าจอ?
            # 3. ช่วงหยุดพักเสียงนานเกินไป?
            if (len(current_chunk) >= max_words) or \
               (current_chars + len(word_text) > max_chars) or \
               (pause_duration > max_pause):
                
                chunks.append(current_chunk)
                current_chunk = []
                
        current_chunk.append(w)
        
    if current_chunk:
        chunks.append(current_chunk)
        
    # เขียนไฟล์ SRT
    with open(output_file, "w", encoding="utf-8") as f:
        for i, chunk in enumerate(chunks):
            start_time = format_time(chunk[0]["start"])
            end_time = format_time(chunk[-1]["end"])
            # เราเชื่อมคำติดกันเลยเพราะภาษาไทยไม่ต้องมีเว้นวรรคระหว่างคำปกติ
            text = "".join(cw["word"] for cw in chunk)
            
            f.write(f"{i+1}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{text}\n\n")
            
    print(f"[+] ซับไตเติ้ล {output_file} (โหมด: {preset}) ถูกสร้างเรียบร้อยแล้ว!")
