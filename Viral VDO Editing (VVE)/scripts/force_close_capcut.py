import psutil
import time

def kill_capcut_processes():
    print("--- [VVE Failsafe] Force Closing CapCut ---")
    
    # Target process names (case-insensitive parts)
    targets = ['capcut', 'jianying']
    killed_count = 0
    
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            name = proc.info['name']
            if name:
                name_lower = name.lower()
                if any(t in name_lower for t in targets):
                    print(f"[*] Killing process: {name} (PID: {proc.info['pid']})")
                    proc.kill()
                    killed_count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    if killed_count > 0:
        print(f"[OK] Successfully terminated {killed_count} CapCut-related processes.")
        # Wait a moment to ensure file locks are released
        time.sleep(2.0)
        print("[!] File locks should now be released.")
    else:
        print("[OK] No CapCut processes were found running. Safe to proceed.")
        
    return killed_count

if __name__ == "__main__":
    kill_capcut_processes()
