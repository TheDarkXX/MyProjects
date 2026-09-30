#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ceoupload.py — Root Wrapper for The CEO Unfiltered Multi-Format Uploader.
Delegates to scripts/ceoupload.py.
"""
import os
import sys
import subprocess

script_path = os.path.join(os.path.dirname(__file__), "scripts", "ceoupload.py")

if __name__ == "__main__":
    cmd = [sys.executable, script_path] + sys.argv[1:]
    sys.exit(subprocess.call(cmd))
