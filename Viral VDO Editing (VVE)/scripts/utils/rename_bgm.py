import os

BGM_DIR = r"V:\DoctorBank Family\DoctorBank Brand\BGM"

# Define mapping from Suno generated names to structured names
MAPPING = {
    # 1. Intrigue / Hook BGM
    "The Clockwork Heart.mp3": "bgm_hook_clockwork_1.mp3",
    "The Clockwork Heart (1).mp3": "bgm_hook_clockwork_2.mp3",
    "The Last Signal.mp3": "bgm_hook_signal_1.mp3",
    "The Last Signal (1).mp3": "bgm_hook_signal_2.mp3",
    
    # 2. Education / Value BGM
    "Soft Focus.mp3": "bgm_edu_focus_1.mp3",
    "Soft Focus (1).mp3": "bgm_edu_focus_2.mp3",
    "The Future is Here.mp3": "bgm_edu_future_1.mp3",
    "The Future is Here (1).mp3": "bgm_edu_future_2.mp3",
    
    # 3. Empathy / Pain Point BGM
    "The Last Letter.mp3": "bgm_sad_letter_1.mp3",
    "The Last Letter (1).mp3": "bgm_sad_letter_2.mp3",
    "The Last Light.mp3": "bgm_sad_light_1.mp3",
    "The Last Light (1).mp3": "bgm_sad_light_2.mp3",
    
    # 4. Comedy / Quirky BGM
    "The Sneaky Mouse.mp3": "bgm_funny_mouse_1.mp3",
    "The Sneaky Mouse (1).mp3": "bgm_funny_mouse_2.mp3",
    "The Tuba's Journey.mp3": "bgm_funny_tuba_1.mp3",
    "The Tuba's Journey (1).mp3": "bgm_funny_tuba_2.mp3",
    
    # 5. Hype / Resolution BGM
    "Rise and Conquer.mp3": "bgm_hype_conquer_1.mp3",
    "Rise and Conquer (1).mp3": "bgm_hype_conquer_2.mp3",
    "Sigma Drift.mp3": "bgm_hype_sigma_1.mp3",
    "Sigma Drift (1).mp3": "bgm_hype_sigma_2.mp3"
}

def rename_bgm():
    if not os.path.exists(BGM_DIR):
        print(f"Error: Directory {BGM_DIR} not found.")
        return
        
    print("Renaming BGM files...")
    renamed_count = 0
    
    for filename in os.listdir(BGM_DIR):
        if filename in MAPPING:
            old_path = os.path.join(BGM_DIR, filename)
            new_path = os.path.join(BGM_DIR, MAPPING[filename])
            
            # Rename
            try:
                os.rename(old_path, new_path)
                print(f"  [OK] Renamed: {filename} -> {MAPPING[filename]}")
                renamed_count += 1
            except Exception as e:
                print(f"  [Error] Failed renaming {filename}: {e}")
                
    print(f"Done! Successfully renamed {renamed_count} BGM files.")

if __name__ == "__main__":
    rename_bgm()
