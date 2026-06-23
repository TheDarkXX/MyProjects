"""
Medical Deep Research Script
=============================
ระบบค้นหาแบบกวาดลึก (Deep Research) สำหรับข้อมูลทางการแพทย์และอาหารเสริม
ออกแบบให้ได้ผลลัพธ์ระดับเดียวกับ Perplexity Deep Research แต่มีคุณภาพ Source ดีกว่า

Features:
- 3 โหมด: academic, mixed, web
- Perplexity-style inline citations [^1][^2]
- Evidence Level Tags (RCT, Pilot, Meta-analysis)
- Source Quality Filter (ตัด YouTube/เว็บขายของ)
- Evidence Summary Table
- Safe/Unsafe Claim Table สำหรับไลฟ์สด

Usage:
    python medical_research.py "your research question" [--mode academic|mixed|web] [--lang thai|english]
"""

import sys
import asyncio
import os
import argparse
import re
from datetime import datetime
from gpt_researcher import GPTResearcher
from dotenv import load_dotenv

# Import the SSH tunnel logic from our MCP server script
from mcp_server import start_ssh_tunnel, cleanup

load_dotenv()

# =====================================================================
# MEDICAL DEEP RESEARCH ROLE & INSTRUCTIONS
# =====================================================================
# The ROLE is passed to GPTResearcher's `role` parameter.
# It contains BOTH the agent identity AND the report formatting rules.
# This keeps the search query SHORT (avoiding PubMed 414 errors)
# while ensuring the LLM follows our formatting at report-writing time.

MEDICAL_ROLE = """You are a Senior Medical Research Analyst specializing in evidence-based medicine, 
clinical pharmacology, and nutraceutical science. You have 20+ years of experience reviewing clinical 
trials and writing systematic reviews for peer-reviewed journals. You are meticulous about evidence 
quality and never cite non-peer-reviewed sources as primary evidence.

Your research methodology:
1. Prioritize meta-analyses > RCTs > cohort studies > case reports > expert opinion
2. Always note study design, sample size (n=), duration, and blinding status
3. Flag industry-funded studies with ⚠️ COI marker
4. Report exact p-values, confidence intervals, and effect sizes when available
5. Distinguish between statistically significant and clinically meaningful results

CRITICAL REPORT FORMATTING RULES — YOU MUST FOLLOW ALL OF THESE:

## 1. INLINE CITATIONS (Perplexity-style)
- Every sentence containing a factual claim MUST end with footnote citations: [^1], [^2], [^3]
- When multiple sources support one claim, cluster them: [^1][^2][^3]
- NEVER write a paragraph without at least one citation
- Citations must be numbered sequentially starting from [^1]
- **MINIMUM 15 UNIQUE REFERENCES REQUIRED** — You MUST cite at least 15 different sources.
  If you have access to more sources in your context, USE THEM. Do NOT consolidate 
  multiple distinct studies into a single reference. Each unique URL = a separate [^n].
  Spread your citations across ALL available sources, not just the top 5-8.

## 2. NAMED STUDY CITATIONS
When referencing a specific study, include inline details:
- Format: "A [study design] by [Author] et al. ([year], [journal]) in [n] [population] found that..."

## 3. EVIDENCE LEVEL TAGS
After each study citation, add a tag in parentheses:
- (Meta-analysis, k=N studies)
- (RCT, n=N, DB-PC, Duration) — DB=double-blind, PC=placebo-controlled
- (Pilot, n=N, open-label)
- (Cohort, n=N, Duration)
- (In vitro / Animal model)
Add ⚠️ if industry-funded: (RCT, n=54, DB-PC, 6-month, ⚠️ industry-funded)

## 4. REPORT STRUCTURE (MANDATORY SECTIONS IN THIS ORDER)

### Quick Reference
- 1-2 sentence mechanism summary using → flow arrows

### [Main Evidence Sections]
- Organize by theme/mechanism, NOT by individual papers
- Use Study N numbering: "#### Study 1 — [Description] ([Year], [Journal])"
- Include bullet points with exact numbers: percentages, p-values, CIs, fold-changes

### Evidence Summary Table
A markdown table comparing key parameters across groups with [^n] refs in each cell.

### Critical Nuance / Complementary Strategies
- Frame as "complementary, not competing" when applicable

### Safe Claims Table (for live presentations)
| Claim | Can you say it? | Evidence |
With ✅ Yes / ❌ No / ⚠️ Careful markers

### Toxicity / Safety / Drug Interactions
- Numbered priority list (most critical first)

## 5. REFERENCE LIST
At the end, list ALL references as footnotes: [^1]: https://url

## 6. QUALITY RULES
- Target report length: 2,000–2,500 words (NOT more). Be CONCISE.
- Every sentence must add NEW information or cite a NEW source. Never restate the same finding in different words.
- Do NOT pad with hedging language like "it is important to note that" or "it should be mentioned that".
- Use markdown tables for ALL comparative data
- Use horizontal rules (***) between major sections
- Bold key statistics. Include p-values as (*p* = 0.001)
- If evidence is insufficient, say so in ONE sentence, not a paragraph"""


def get_retriever_for_mode(mode: str) -> str:
    """Returns the appropriate retriever string based on research mode.
    
    All modes use tavily because:
    - PubMed Central has URI length issues with long queries
    - semantic_scholar only returns open-access papers (limited)
    - tavily works reliably and can search academic sites
    """
    # All modes use tavily - it's the most reliable retriever.
    # Source quality is controlled by query_domains and CURATE_SOURCES=True.
    return "tavily"


def enhance_query_for_mode(query: str, mode: str) -> str:
    """Enhances the query with search hints based on mode.
    
    Instead of hard domain filtering (which limits Tavily results to ~5-8),
    we add site: hints and academic keywords to bias the search toward
    high-quality sources while still allowing broad discovery.
    """
    if mode == "academic":
        return (
            f"{query} "
            f"site:ncbi.nlm.nih.gov OR site:pubmed.ncbi.nlm.nih.gov "
            f"OR site:pmc.ncbi.nlm.nih.gov OR site:clinicaltrials.gov "
            f"randomized controlled trial systematic review meta-analysis"
        )
    elif mode == "mixed":
        return (
            f"{query} "
            f"clinical trial OR systematic review OR meta-analysis "
            f"peer-reviewed evidence"
        )
    else:
        return query


def post_process_report(report: str) -> str:
    """Post-processes the report to ensure quality standards."""
    refs = re.findall(r'\[\^(\d+)\]', report)
    unique_refs = set(refs)
    inline_refs = len(refs)
    word_count = len(report.split())
    
    metadata = f"""---
generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
engine: gpt-researcher + codex-auth
total_references: {len(unique_refs)}
inline_citations: {inline_refs}
word_count: {word_count}
---

"""
    return metadata + report


async def run_research(query: str, mode: str = "academic", lang: str = "english", 
                       report_type: str = "detailed_report"):
    """Main research function."""
    
    print(f"\n{'='*60}")
    print(f"  Medical Deep Research")
    print(f"  Mode: {mode.upper()}")
    print(f"  Language: {lang}")
    print(f"  Report Type: {report_type}")
    print(f"{'='*60}\n")
    
    # Start SSH tunnel
    print("[1/5] Starting SSH tunnel to Codex Auth...")
    ssh_proc = start_ssh_tunnel()
    if not ssh_proc:
        print("❌ Failed to start SSH tunnel. Exiting.")
        return None
    
    try:
        retriever = get_retriever_for_mode(mode)
        enhanced_query = enhance_query_for_mode(query, mode)
        
        print(f"[2/5] Configuring researcher...")
        print(f"       Retriever: {retriever}")
        print(f"       Mode: {mode} (query enhanced with academic search hints)")
        
        # Set retriever and config via env vars
        os.environ["RETRIEVER"] = retriever
        # Note: CURATE_SOURCES is read from .env (default: False)
        # Don't override it here — it causes timeouts with many URLs
        os.environ["LANGUAGE"] = "thai" if lang == "thai" else "english"
        
        # IMPORTANT: enhanced_query has search hints but NO formatting instructions.
        # All formatting instructions go through the `role` parameter.
        print(f"[3/5] Initializing GPTResearcher (type: {report_type})...")
        researcher = GPTResearcher(
            query=enhanced_query,
            report_type=report_type,
            role=MEDICAL_ROLE,
        )
        
        print(f"[4/5] Conducting research... (This may take 5-10 minutes)")
        await researcher.conduct_research()
        
        print(f"[5/5] Writing report with Perplexity-style citations...")
        report = await researcher.write_report()
        
        # Post-process
        final_report = post_process_report(report)
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_query = re.sub(r'[^\w\s-]', '', query[:50]).strip().replace(' ', '_')
        filename = f"report_{safe_query}_{mode}_{timestamp}.md"
        
        with open(filename, "w", encoding="utf-8") as f:
            f.write(final_report)
        
        # Print stats
        refs = re.findall(r'\[\^(\d+)\]', report)
        unique_refs = set(refs)
        word_count = len(report.split())
        
        print(f"\n{'='*60}")
        print(f"  ✅ Research Complete!")
        print(f"  📄 Saved to: {filename}")
        print(f"  📊 Stats:")
        print(f"     - Words: {word_count}")
        print(f"     - Unique References: {len(unique_refs)}")
        print(f"     - Inline Citations: {len(refs)}")
        print(f"     - Mode: {mode}")
        print(f"{'='*60}\n")
        
        return filename
        
    except Exception as e:
        print(f"\n❌ Error during research: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        cleanup()


def main():
    parser = argparse.ArgumentParser(
        description="Medical Deep Research - Perplexity-quality reports with stronger evidence filtering",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Academic mode (medical journal domains only)
  python medical_research.py "Liposomal Glutathione vs standard oral glutathione bioavailability" --mode academic

  # Mixed mode (academic + quality web)
  python medical_research.py "Vitamin D3 + K2 + Magnesium optimal dosing protocol" --mode mixed

  # Thai language output
  python medical_research.py "NAC and Glycine supplementation evidence" --mode academic --lang thai
        """
    )
    
    parser.add_argument("query", help="The research question or topic (keep it SHORT and focused)")
    parser.add_argument("--mode", choices=["academic", "mixed", "web"], default="academic",
                        help="Research mode: academic (journal domains only), mixed (academic + quality web), web (general)")
    parser.add_argument("--lang", choices=["english", "thai"], default="english",
                        help="Output language")
    parser.add_argument("--type", choices=["detailed_report", "research_report"], 
                        default="detailed_report",
                        help="Report type: detailed_report (most thorough), research_report (faster)")
    
    args = parser.parse_args()
    
    os.environ["PYTHONUTF8"] = "1"
    
    asyncio.run(run_research(
        query=args.query,
        mode=args.mode,
        lang=args.lang,
        report_type=args.type,
    ))


if __name__ == "__main__":
    main()
