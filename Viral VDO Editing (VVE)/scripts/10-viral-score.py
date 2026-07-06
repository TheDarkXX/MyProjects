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
    if len(sys.argv) < 2:
        print("Usage: python 10-viral-score.py <job_dir>")
        sys.exit(1)
    main(sys.argv[1])
