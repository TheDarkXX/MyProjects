import sys
import asyncio
import os
from gpt_researcher import GPTResearcher
from dotenv import load_dotenv

# Import the SSH tunnel logic from our MCP server script
from mcp_server import start_ssh_tunnel, cleanup

load_dotenv()

async def main():
    query = "Strong evidence that Liposomal Glutathione is superior to standard Glutathione, and studies showing the necessity of supplementing NAC and Glycine together. Focus on strong clinical evidence for live stream presentation. (in Thai language if possible, otherwise English)"
    
    print("Initializing test research...")
    ssh_proc = start_ssh_tunnel()
    if not ssh_proc:
        print("Failed to start tunnel, exiting.")
        return

    try:
        print(f"Researching: {query}")
        researcher = GPTResearcher(query=query, report_type="detailed_report")
        
        print("Conducting research...")
        await researcher.conduct_research()
        
        print("Writing report...")
        report = await researcher.write_report()
        
        print("\n=== FINAL REPORT ===\n")
        print(report)
        print("\n====================\n")
        
        # Save to file
        with open("test_report.md", "w", encoding="utf-8") as f:
            f.write(report)
        print("Saved to test_report.md")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cleanup()

if __name__ == "__main__":
    asyncio.run(main())
