import os
import sys
import time
import socket
import json
import re
import glob
from datetime import datetime

# Windows encoding safety
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass


def check_dns(host):
    try:
        t0 = time.perf_counter()
        ip = socket.gethostbyname(host)
        dt = (time.perf_counter() - t0) * 1000
        return True, ip, round(dt, 1)
    except Exception as e:
        return False, str(e), 0

def check_tcp(host, port=443, timeout=3.0, samples=5):
    """Sample TCP handshake several times. Returns dict with ok/fail counts and ms stats."""
    times = []
    fails = 0
    for _ in range(samples):
        try:
            t0 = time.perf_counter()
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            s.connect((host, port))
            times.append((time.perf_counter() - t0) * 1000)
            s.close()
        except Exception:
            fails += 1
    return {
        "ok": len(times),
        "fail": fails,
        "min": round(min(times), 1) if times else None,
        "avg": round(sum(times) / len(times), 1) if times else None,
        "max": round(max(times), 1) if times else None,
    }

def fmt_tcp(r):
    if r["ok"] == 0:
        return f"ALL FAILED ({r['fail']}/{r['fail']} timeouts)"
    s = f"avg {r['avg']} ms (min {r['min']} / max {r['max']})"
    if r["fail"]:
        s += f" | {r['fail']} TIMEOUT"
    return s

def run_ping_cmd(host, count=3):
    import subprocess
    try:
        cmd = f"ping -n {count} {host}"
        out = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.STDOUT)
        m_avg = re.search(r"Average = (\d+)ms", out)
        m_loss = re.search(r"(\d+)% loss", out)
        avg_ms = int(m_avg.group(1)) if m_avg else None
        loss_pct = int(m_loss.group(1)) if m_loss else 0
        return avg_ms, loss_pct, out
    except Exception as e:
        return None, 100, str(e)

def check_disk_io():
    """Benchmark small file write/read in .gemini to test antivirus latency"""
    candidates = [
        os.path.expanduser(r"~\.gemini\antigravity"),
        os.path.expanduser(r"~\.gemini\antigravity-ide"),
        os.path.expanduser(r"~\.gemini")
    ]
    app_data = None
    for c in candidates:
        if os.path.exists(c):
            app_data = c
            break
            
    if not app_data:
        return None, "Not found"
    
    test_file = os.path.join(app_data, "_io_benchmark_test.tmp")
    try:
        payload = b"X" * 65536 # 64KB
        t0 = time.perf_counter()
        with open(test_file, "wb") as f:
            f.write(payload)
            f.flush()
            os.fsync(f.fileno())
        write_time = (time.perf_counter() - t0) * 1000
        
        t1 = time.perf_counter()
        with open(test_file, "rb") as f:
            _ = f.read()
        read_time = (time.perf_counter() - t1) * 1000
        
        if os.path.exists(test_file):
            os.remove(test_file)
        return round(write_time, 1), round(read_time, 1)
    except Exception as e:
        if os.path.exists(test_file):
            try:
                os.remove(test_file)
            except:
                pass
        return None, str(e)

def analyze_latest_transcript(target_conv_id=None):
    """Parse transcript to calculate True User Wall-Clock, Queue, and Tool Execution Loops"""
    candidates = [
        os.path.expanduser(r"~\.gemini\antigravity\brain"),
        os.path.expanduser(r"~\.gemini\antigravity-ide\brain")
    ]
    brain_dir = None
    for c in candidates:
        if os.path.exists(c):
            brain_dir = c
            break
            
    if not brain_dir:
        return None
    
    target_path = None
    if target_conv_id:
        p = os.path.join(brain_dir, target_conv_id, ".system_generated", "logs", "transcript.jsonl")
        if os.path.exists(p): target_path = p
        else:
            p_full = os.path.join(brain_dir, target_conv_id, ".system_generated", "logs", "transcript_full.jsonl")
            if os.path.exists(p_full): target_path = p_full

    if not target_path:
        pattern = os.path.join(brain_dir, "*", ".system_generated", "logs", "transcript.jsonl")
        files = glob.glob(pattern)
        if not files:
            pattern_full = os.path.join(brain_dir, "*", ".system_generated", "logs", "transcript_full.jsonl")
            files = glob.glob(pattern_full)
        if not files:
            return None
        files.sort(key=os.path.getmtime, reverse=True)
        target_path = files[0]

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            lines = [json.loads(line) for line in f if line.strip()]
        
        if not lines:
            return None
        
        def parse_iso(ts_str):
            if not ts_str: return None
            return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

        user_turns = []
        for i, l in enumerate(lines):
            if l.get("type") == "USER_INPUT":
                user_turns.append((i, l))

        total_turns = len(user_turns)
        turns_summary = []

        # Analyze the last 3 turns
        recent_turns = user_turns[-3:]
        for idx, (line_idx, u_turn) in enumerate(recent_turns):
            u_ts = parse_iso(u_turn.get("created_at"))
            u_text = u_turn.get("content", "")
            # Clean XML tags
            u_clean = u_text.split("</USER_REQUEST>")[0].replace("<USER_REQUEST>", "").strip()
            if not u_clean: u_clean = u_text[:40].replace("\n", " ")
            u_clean = u_clean.replace("\n", " ")
            if len(u_clean) > 45: u_clean = u_clean[:42] + "..."

            # Find boundary for this turn
            pos = user_turns.index((line_idx, u_turn))
            next_u_idx = user_turns[pos + 1][0] if pos + 1 < len(user_turns) else len(lines)
            turn_slice = lines[line_idx:next_u_idx]

            first_model = None
            last_text = None
            tools_count = 0
            tools_list = []

            for s in turn_slice:
                if s.get("source") == "MODEL":
                    if first_model is None:
                        first_model = s
                    if s.get("content"):
                        last_text = s
                if s.get("tool_calls"):
                    for tc in s["tool_calls"]:
                        tools_count += 1
                        name = tc.get("function", {}).get("name") or tc.get("name")
                        if name: tools_list.append(name)

            q_sec = (parse_iso(first_model.get("created_at")) - u_ts).total_seconds() if (first_model and u_ts) else 0.0
            
            # If turn is complete (has final text)
            if last_text and u_ts:
                total_sec = (parse_iso(last_text.get("created_at")) - u_ts).total_seconds()
                is_active = False
            else:
                # Currently running turn
                total_sec = (datetime.now(u_ts.tzinfo) - u_ts).total_seconds() if u_ts else 0.0
                is_active = True

            unique_tools = list(dict.fromkeys(tools_list))
            turns_summary.append({
                "prompt": u_clean,
                "sent_at": u_ts.strftime("%H:%M:%S") if u_ts else "-",
                "first_action_sec": round(q_sec, 1),
                "tools_count": tools_count,
                "unique_tools": unique_tools,
                "total_wall_sec": round(total_sec, 1),
                "is_active": is_active
            })

        latest = turns_summary[-1] if turns_summary else None
        
        return {
            "path": target_path,
            "total_steps": len(lines),
            "total_user_turns": total_turns,
            "latest_turn": latest,
            "recent_turns": turns_summary
        }
    except Exception as e:
        return {"error": str(e)}

def main():
    conv_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    print("=" * 60)
    print("🚀 ANTIGRAVITY FULL LIFECYCLE DIAGNOSTIC PROFILER (V2)")
    print("=" * 60)
    
    # 1. Network Probe
    print("\n[1] 🌐 NETWORK & GATEWAY PROBE")
    host_gemini = "generativelanguage.googleapis.com"
    host_channel = "jetski-webchannel.googleapis.com"
    
    ok_dns, ip_gemini, dns_ms = check_dns(host_gemini)
    avg_ping, loss, _ = run_ping_cmd(host_gemini, count=3)
    tcp1 = check_tcp(host_gemini, 443)
    tcp2 = check_tcp(host_channel, 443)
    tcp_fail = tcp1["fail"] + tcp2["fail"]
    tcp_slow = any(r["max"] and r["max"] > 500 for r in (tcp1, tcp2))
    
    if tcp_fail or (avg_ping is None) or loss > 0:
        status_net = "🔴 UNSTABLE (TCP timeout / packet loss)"
    elif tcp_slow or avg_ping > 150:
        status_net = "🟡 SLOW HANDSHAKE"
    elif avg_ping < 50:
        status_net = "🟢 EXCELLENT"
    else:
        status_net = "🟡 FAIR"
    
    print(f"  • Endpoint: {host_gemini} ({ip_gemini})")
    print(f"  • DNS Resolve: {dns_ms} ms")
    print(f"  • ICMP Ping: {avg_ping if avg_ping is not None else 'TIMEOUT'} ms (Packet Loss: {loss}%)")
    print(f"  • TCP 443 Gemini API x5: {fmt_tcp(tcp1)}")
    print(f"  • TCP 443 Jetski Channel x5: {fmt_tcp(tcp2)}")
    print(f"  ➜ Network Verdict: {status_net}")

    # 2. True User Wall-Clock & E2E Lifecycle
    print("\n[2] ⏱️ TRUE USER WALL-CLOCK & E2E LIFECYCLE (ส่งคำสั่ง ➔ พ่นคำตอบ)")
    tinfo = analyze_latest_transcript(conv_id)
    if tinfo and "latest_turn" in tinfo and tinfo["latest_turn"]:
        lat = tinfo["latest_turn"]
        print(f"  • คำสั่งรอบล่าสุด : \"{lat['prompt']}\" (ส่งตอน {lat['sent_at']})")
        print(f"  • Cloud Queue (1st Move) : {lat['first_action_sec']}s (คลาวด์รับงาน)")
        print(f"  • Tool Loops Execution  : {lat['tools_count']} ครั้ง ({', '.join(lat['unique_tools']) if lat['unique_tools'] else 'None'})")
        status_wall = "🟢 จรวดเร็ว (<5s)" if lat['total_wall_sec'] < 5.0 else ("🟡 ปานกลาง (5-20s)" if lat['total_wall_sec'] < 20.0 else "🔴 งานหนัก/รอข้ามนาที (>20s)")
        print(f"  • ⌛ เวลารอคอยจริง (True Wall-Clock): {lat['total_wall_sec']}s  ➔ {status_wall}")
        
        if len(tinfo["recent_turns"]) > 1:
            print("\n  📊 ประวัติเวลารอคอยย้อนหลัง 3 รอบล่าสุด:")
            for idx, tr in enumerate(tinfo["recent_turns"]):
                tag = " (รอบปัจจุบัน)" if tr.get("is_active") else ""
                tools_str = f"{tr['tools_count']} tools" if tr['tools_count'] else "0 tools"
                print(f"     #{idx+1} [{tr['prompt']:<30}] ➔ รอรวม {tr['total_wall_sec']:>5.1f}s (คิว {tr['first_action_sec']}s | {tools_str}){tag}")
    else:
        print("  • ไม่พบบันทึกประวัติรอบก่อนหน้าใน transcript")

    # 3. Local Machine & Disk I/O
    print("\n[3] 💻 LOCAL MACHINE & DISK I/O (Antivirus / Storage Check)")
    w_ms, r_ms = check_disk_io()
    if w_ms is not None:
        status_io = "🟢 FAST (SSD)" if w_ms < 15.0 else ("🟡 ACCEPTABLE" if w_ms < 50.0 else "🔴 STRANGLED (Antivirus/HDD)")
        print(f"  • .gemini Disk Sync Write (64KB): {w_ms} ms")
        print(f"  • .gemini Disk Read: {r_ms} ms")
        print(f"  ➜ Storage / Antivirus Verdict: {status_io}")
    else:
        print(f"  • Disk I/O check failed: {r_ms}")

    # 4. Overall Verdict
    print("\n" + "=" * 60)
    print("🎯 SUMMARY VERDICT:")
    verdicts = []
    if avg_ping and avg_ping > 150:
        verdicts.append("🔴 ท่อเน็ตมึงมีปัญหา (Ping สูง หรือ Proxy ดัก)")
    if tcp_fail:
        verdicts.append(f"🔴 TCP 443 handshake timeout {tcp_fail}/10 ครั้ง — ท่อไป Google ไม่นิ่ง (เสี่ยง request ค้าง/retry)")
    elif tcp_slow:
        verdicts.append("🟡 TCP handshake บางครั้งช้าเกิน 500 ms")
    if w_ms and w_ms > 50:
        verdicts.append("🔴 แอนตี้ไวรัสในเครื่องกำลังสแกนไฟล์ .gemini หน่วงดิสก์")
        
    if tinfo and tinfo.get("latest_turn"):
        lat = tinfo["latest_turn"]
        if lat["total_wall_sec"] > 20 and lat["tools_count"] > 5:
            verdicts.append(f"💡 ที่มึงเห็นค้าง {lat['total_wall_sec']}s ไม่ใช่เน็ตช้า แต่เพราะ AI ต้องวิ่งรัน Tool หลังบ้าน {lat['tools_count']} รอบ (PowerShell Spawn + Disk/Git IO)")
            
    if not verdicts:
        verdicts.append("🟢 ระบบทุกชั้นลื่นหัวแตก! ปัญหาหน่วงที่เจออาจมาจาก High Thinking Mode หรือ Electron GPU Fallback")
    
    for v in verdicts:
        print(f"  {v}")
    print("=" * 60)

if __name__ == "__main__":
    main()
