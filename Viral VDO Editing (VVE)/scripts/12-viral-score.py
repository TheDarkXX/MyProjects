import os
import sys

def main(job_dir):
    print("\n" + "="*50)
    print("🎬 STEP 10: VIRAL SCORE (AG BUILT-IN)")
    print("="*50)
    print("Your video has passed the QA Recheck successfully!")
    print("To get your final Viral Score and Dopamine Hit analysis, please:")
    print("  1. Export the MP4 video from CapCut.")
    print("  2. Ensure your IDE Model is set to 'Gemini 3.5 Flash (High)' or 'Gemini 3.1 Pro (High)'.")
    print("  3. Drag the exported MP4 file into the AG chat window.")
    print("  4. Type the command: /viralscore")
    print("AG will analyze your video visually and audibly in a single pass!")
    print("="*50)

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "utils"))
    try:
        from registry import get_active_project, update_step
    except ImportError:
        print("❌ Error: Could not import utils modules.")
        sys.exit(1)
        
    if len(sys.argv) >= 2:
        input_arg = sys.argv[1]
    else:
        input_arg = get_active_project()
        if not input_arg:
            print("Usage: python 12-viral-score.py <job_dir>")
            sys.exit(1)
        print(f"📌 Using active project: {input_arg}")
        
    update_step(input_arg, "12", "wip")
    main(input_arg)
    update_step(input_arg, "12", "done")
