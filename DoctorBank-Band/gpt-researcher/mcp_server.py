import sys
import subprocess
import atexit
import asyncio
import os
from mcp.server.fastmcp import FastMCP
from gpt_researcher import GPTResearcher
from dotenv import load_dotenv

# โหลดตัวแปรสภาพแวดล้อมจาก .env (ซึ่งชี้ไปหา localhost:18810)
load_dotenv()

def start_ssh_tunnel():
    print("Starting SSH tunnel to Codex Auth (185.250.38.247:18810)...", file=sys.stderr)
    try:
        # สั่งเปิด SSH แบบไม่มีคำสั่ง (-N) และโยงพอร์ต (-L) ไว้เบื้องหลัง
        proc = subprocess.Popen(
            ["ssh", "-N", "-L", "18810:localhost:18810", "root@185.250.38.247"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        print(f"SSH tunnel started (PID: {proc.pid})", file=sys.stderr)
        return proc
    except Exception as e:
        print(f"Failed to start SSH tunnel: {e}", file=sys.stderr)
        return None

# สั่งรัน Tunnel ตั้งแต่ตอนเริ่มต้น MCP Server
ssh_proc = start_ssh_tunnel()

def cleanup():
    if ssh_proc:
        print("Closing SSH tunnel...", file=sys.stderr)
        ssh_proc.terminate()

# ตรวจจับตอนที่ MCP Server โดนปิด (เช่น AG เลิกใช้) ให้ปิด Tunnel ด้วย
atexit.register(cleanup)

# สร้าง MCP Server
mcp = FastMCP("GPT-Researcher")

# =====================================================================
# MEDICAL DEEP RESEARCH SYSTEM PROMPT
# =====================================================================

MEDICAL_AGENT_ROLE = """You are a Senior Medical Research Analyst specializing in evidence-based medicine, 
clinical pharmacology, and nutraceutical science. You have 20+ years of experience reviewing clinical 
trials and writing systematic reviews for peer-reviewed journals."""

MEDICAL_REPORT_INSTRUCTIONS = """
CRITICAL REPORT FORMATTING RULES:

## 1. INLINE CITATIONS (Perplexity-style)
- Every factual claim MUST end with footnote citations: [^1], [^2]
- Cluster multiple sources: [^1][^2][^3]

## 2. NAMED STUDY CITATIONS
- Format: "A [study design] by [Author] et al. ([year], [journal]) in [n] [population]..."

## 3. EVIDENCE LEVEL TAGS
- (RCT, n=N, DB-PC, Duration) or (Pilot, n=N, open-label) or (Meta-analysis, k=N)
- Add ⚠️ if industry-funded

## 4. MANDATORY SECTIONS
- Quick Reference (mechanism with → arrows)
- Evidence sections with Study N numbering
- Evidence Summary Table
- Safe Claims Table (✅/❌/⚠️)
- References as footnotes [^1]: url

## 5. QUALITY
- Minimum 2,500 words
- Include p-values, CIs, effect sizes
- Flag conflicts of interest
"""


@mcp.tool()
async def research(query: str, report_type: str = "research_report") -> str:
    """Conducts autonomous deep research on a given query and returns a markdown report.
    
    Args:
        query: The main topic or question to research. Be detailed.
        report_type: Type of report (default: "research_report"). Options: "research_report", "detailed_report", "deep".
    """
    print(f"Received research request: '{query}' (Type: {report_type})", file=sys.stderr)
    try:
        researcher = GPTResearcher(query=query, report_type=report_type)
        
        print("Conducting research... (This might take a few minutes)", file=sys.stderr)
        await researcher.conduct_research()
        
        print("Compiling final report...", file=sys.stderr)
        report = await researcher.write_report()
        
        print("Research successfully completed.", file=sys.stderr)
        return report
    except Exception as e:
        error_msg = f"Error during research: {str(e)}"
        print(error_msg, file=sys.stderr)
        return error_msg


@mcp.tool()
async def medical_research(query: str, mode: str = "academic", language: str = "english") -> str:
    """Conducts medical-grade deep research with Perplexity-style inline citations.
    
    Produces reports with:
    - Sentence-level [^1][^2] citations
    - Evidence Level Tags (RCT, Pilot, Meta-analysis)
    - Source quality filtering (academic sources only in 'academic' mode)
    - Evidence Summary Table
    - Safe/Unsafe Claims Table for live presentations
    
    Args:
        query: The medical/supplement research question. Be specific and detailed.
        mode: Research mode - "academic" (PubMed/PMC only), "mixed" (academic + filtered web), "web" (general).
        language: Output language - "english" or "thai".
    """
    print(f"[Medical Research] Query: '{query}'", file=sys.stderr)
    print(f"[Medical Research] Mode: {mode}, Language: {language}", file=sys.stderr)
    
    # Set retriever based on mode
    retrievers = {
        "academic": "pubmed_central",
        "mixed": "pubmed_central,tavily", 
        "web": "tavily",
    }
    retriever = retrievers.get(mode, "pubmed_central")
    
    # Enhance query based on mode
    if mode == "academic":
        enhanced_query = (
            f"{query}\n\n"
            f"SEARCH INSTRUCTIONS: Focus exclusively on peer-reviewed clinical evidence. "
            f"Prioritize: PubMed Central, Semantic Scholar, ClinicalTrials.gov. "
            f"Include ONLY RCTs, meta-analyses, systematic reviews, and cohort studies. "
            f"Exclude: blogs, supplement websites, YouTube, news articles."
        )
    elif mode == "mixed":
        enhanced_query = (
            f"{query}\n\n"
            f"SEARCH INSTRUCTIONS: Combine academic databases with high-quality web sources. "
            f"Prefer: .gov, .edu, medical institution websites. "
            f"Exclude: supplement blogs, wellness influencer content, YouTube."
        )
    else:
        enhanced_query = query
    
    # Build full query with medical formatting instructions
    full_query = f"{enhanced_query}\n\n{MEDICAL_REPORT_INSTRUCTIONS}"
    
    try:
        # Set environment for this run
        os.environ["RETRIEVER"] = retriever
        os.environ["AGENT_ROLE"] = MEDICAL_AGENT_ROLE
        os.environ["LANGUAGE"] = language
        
        researcher = GPTResearcher(query=full_query, report_type="deep")
        
        print(f"Conducting medical research (retriever: {retriever})...", file=sys.stderr)
        print("This may take 5-10 minutes for deep research.", file=sys.stderr)
        await researcher.conduct_research()
        
        print("Writing report with Perplexity-style citations...", file=sys.stderr)
        report = await researcher.write_report()
        
        print("Medical research completed successfully.", file=sys.stderr)
        return report
    except Exception as e:
        error_msg = f"Error during medical research: {str(e)}"
        print(error_msg, file=sys.stderr)
        return error_msg


if __name__ == "__main__":
    # เริ่มการเชื่อมต่อ MCP
    mcp.run()
