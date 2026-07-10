import os

filepath = r"C:\My Claw\MyProjects\Viral VDO Editing (VVE)\scripts\10-capcut-inject.py"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = """    try:
        from utils.capcut_utils import force_close_capcut
        force_close_capcut()
    except Exception as e:
        print(f"Warning: Failed to close CapCut: {e}")"""

replacement = """    try:
        from utils.capcut_utils import force_close_capcut, get_project_path, get_draft_path
        force_close_capcut()
        project_dir = get_project_path(job_dir)
        draft_path = get_draft_path(job_dir)
    except Exception as e:
        print(f"Warning: Failed to close CapCut or find project: {e}")
        return False"""

content = content.replace(target, replacement)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied successfully.")
