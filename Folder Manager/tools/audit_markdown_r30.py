#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/audit_markdown_r30.py

Automated Linter & Quality Auditor for RFC Rule R30 (Long-File Ergonomics & Interactive TOC Protocol).
Checks Markdown files against DrView Authoring Bible standards:
  1. Trigger threshold: Lines >= 150 OR H2 Count >= 4
  2. Executive TL;DR Card within top section
  3. In-File Interactive TOC (<a id="toc">)
  4. Explicit ASCII Anchors (<a id="...">) before H2 headings (No Thai/Emoji slugs)
  5. Standardized Return Button ([⬆️ กลับสู่สารบัญ](#toc))
  6. HTML Allowlist compliance (Only <a id>, <details>, <summary>; No <mark>, <span>, <kbd>, <style>, <script>)

Usage:
  python tools/audit_markdown_r30.py <path-to-file.md>
  python tools/audit_markdown_r30.py --scan-docs
  python tools/audit_markdown_r30.py --all
"""

import sys
import os
import re
import glob

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

FORBIDDEN_TAGS = [
    re.compile(r'<mark\b[^>]*>', re.IGNORECASE),
    re.compile(r'<kbd\b[^>]*>', re.IGNORECASE),
    re.compile(r'<span\b[^>]*style=[^>]*>', re.IGNORECASE),
    re.compile(r'<style\b[^>]*>', re.IGNORECASE),
    re.compile(r'<script\b[^>]*>', re.IGNORECASE),
    re.compile(r'<iframe\b[^>]*>', re.IGNORECASE),
]

def audit_file(filepath):
    if not os.path.exists(filepath):
        return {"status": "ERROR", "msg": f"File not found: {filepath}"}

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        return {"status": "ERROR", "msg": f"Read error: {str(e)}"}

    lines = content.splitlines()
    total_lines = len(lines)

    fname = os.path.basename(filepath)
    if fname in ["SKILL.md", "README.md", "_INDEX.md", "_TAGS.md"]:
        return {
            "status": "PASS",
            "filepath": filepath,
            "total_lines": total_lines,
            "h2_count": 0,
            "is_r30_target": False,
            "issues": [],
            "warnings": [],
            "exempt": True
        }

    # 1. Mask code blocks and inline code to prevent false positives in code snippets
    non_code_lines = []
    in_code_block = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):

            in_code_block = not in_code_block
            non_code_lines.append("") # blank placeholder
            continue
        if in_code_block:
            non_code_lines.append("")
        else:
            # Strip inline code spans like `<mark>` so mentions in docs don't trigger false positives
            cleaned_line = re.sub(r'`[^`]+`', '', line)
            non_code_lines.append(cleaned_line)

    non_code_text = "\n".join(non_code_lines)


    # 2. Check forbidden HTML tags
    forbidden_found = []
    for tag_regex in FORBIDDEN_TAGS:
        matches = tag_regex.findall(non_code_text)
        if matches:
            forbidden_found.extend(matches)

    # 3. Detect H2 headers outside code blocks
    h2_indices = []
    for i, line in enumerate(non_code_lines):
        if re.match(r'^##\s+', line):
            h2_indices.append((i, line))

    h2_count = len(h2_indices)
    is_r30_target = (total_lines >= 150) or (h2_count >= 4)

    issues = []
    warnings = []

    if forbidden_found:
        issues.append(f"Forbidden HTML tags detected: {', '.join(set(forbidden_found[:5]))}")

    if is_r30_target:
        # Check TL;DR Card (usually in first 25 non-code lines or before first H2)
        top_slice = "\n".join(non_code_lines[:30])
        has_tldr = bool(re.search(r'(TL;DR|Executive TL;DR|Executive Brief)', top_slice, re.IGNORECASE))
        if not has_tldr:
            warnings.append("Missing Executive TL;DR Card within top lines")

        # Check In-File TOC anchor
        has_toc_anchor = bool(re.search(r'<a\s+id=[\'"]toc[\'"]\s*>', non_code_text, re.IGNORECASE))
        if not has_toc_anchor:
            issues.append("Missing <a id=\"toc\"></a> for In-File Interactive TOC")

        # Check Explicit ASCII Anchors on H2 headers
        # Check if immediately preceding line or nearby contains <a id="...">
        missing_anchors = []
        for idx, line in h2_indices:
            # Check 2 lines above
            above_text = "\n".join(non_code_lines[max(0, idx-2):idx])
            anchor_match = re.search(r'<a\s+id=[\'"]([a-zA-Z0-9_\-]+)[\'"]\s*>', above_text)
            # If not above, check on the line itself
            if not anchor_match:
                anchor_match = re.search(r'<a\s+id=[\'"]([a-zA-Z0-9_\-]+)[\'"]\s*>', line)
            
            if not anchor_match:
                clean_h2 = line.replace('##', '').strip()[:25]
                missing_anchors.append(clean_h2)

        if missing_anchors:
            issues.append(f"Missing explicit ASCII anchor on {len(missing_anchors)} H2 headers (e.g., '{missing_anchors[0]}')")

        # Check Return Button
        has_return_button = bool(re.search(r'\[⬆️\s*กลับสู่สารบัญ\]\(#toc\)', non_code_text))
        if not has_return_button:
            warnings.append("Missing Jump Back Button: [⬆️ กลับสู่สารบัญ](#toc)")

    status = "PASS"
    if issues:
        status = "FAIL"
    elif warnings:
        status = "WARN"

    return {
        "status": status,
        "filepath": filepath,
        "total_lines": total_lines,
        "h2_count": h2_count,
        "is_r30_target": is_r30_target,
        "issues": issues,
        "warnings": warnings
    }

def main():
    args = sys.argv[1:]
    if not args or args[0] in ["--scan-docs", "--all"]:
        # Default scan target directories in XBrain
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        patterns = [
            os.path.join(root_dir, "docs", "*.md"),
            os.path.join(root_dir, "docs", "**", "*.md"),
            os.path.join(root_dir, "vault", "**", "*.md"),
        ]
        files = []
        for pat in patterns:
            files.extend(glob.glob(pat, recursive=True))
        files = sorted(list(set(files)))
    else:
        files = [os.path.abspath(f) for f in args if f.endswith(".md")]

    if not files:
        print("No markdown files found to audit.")
        return

    print("=" * 80)
    print("🔍 RFC RULE R30 MARKDOWN ERGONOMICS AUDITOR")
    print("=" * 80)

    pass_count = 0
    warn_count = 0
    fail_count = 0
    skipped_count = 0

    for fpath in files:
        res = audit_file(fpath)
        rel_path = os.path.relpath(fpath, os.getcwd())

        if not res.get("is_r30_target", False):
            # Short file, doesn't trigger R30 threshold
            skipped_count += 1
            continue

        if res["status"] == "PASS":
            pass_count += 1
            print(f"✅ PASS: {rel_path} ({res['total_lines']} lines, {res['h2_count']} H2s)")
        elif res["status"] == "WARN":
            warn_count += 1
            print(f"⚠️  WARN: {rel_path} ({res['total_lines']} lines, {res['h2_count']} H2s)")
            for w in res["warnings"]:
                print(f"    - 💡 {w}")
        else:
            fail_count += 1
            print(f"❌ FAIL: {rel_path} ({res['total_lines']} lines, {res['h2_count']} H2s)")
            for iss in res["issues"]:
                print(f"    - 🚨 {iss}")
            for w in res["warnings"]:
                print(f"    - 💡 {w}")

    print("=" * 80)
    print(f"Summary: PASS={pass_count} | WARN={warn_count} | FAIL={fail_count} | Short (Exempt)={skipped_count}")
    print("=" * 80)

    if fail_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
