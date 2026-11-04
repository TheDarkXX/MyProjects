import sqlite3
import glob
import os
import json

appdata = os.environ.get('APPDATA', '')
if not appdata:
    exit(0)

# 1. Clean globalStorage conflictingDefaults
global_db = os.path.join(appdata, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb')
if os.path.exists(global_db):
    try:
        conn = sqlite3.connect(global_db)
        cur = conn.cursor()
        cur.execute("SELECT value FROM ItemTable WHERE key = 'editorOverrideService.conflictingDefaults'")
        row = cur.fetchone()
        if row:
            val = json.loads(row[0].decode('utf-8') if isinstance(row[0], bytes) else row[0])
            val['*.md'] = ['drview.mdViewer']
            cur.execute("UPDATE ItemTable SET value = ? WHERE key = 'editorOverrideService.conflictingDefaults'", (json.dumps(val),))
            conn.commit()
        conn.close()
    except Exception:
        pass

# 2. Redirect stale history.entries in all workspaces
ws_base = os.path.join(appdata, 'Antigravity IDE', 'User', 'workspaceStorage')
dbs = glob.glob(os.path.join(ws_base, '*', 'state.vscdb'))
for db in dbs:
    try:
        conn = sqlite3.connect(db)
        cur = conn.cursor()
        cur.execute("SELECT value FROM ItemTable WHERE key = 'history.entries'")
        row = cur.fetchone()
        if row:
            val = row[0].decode('utf-8') if isinstance(row[0], bytes) else row[0]
            entries = json.loads(val)
            modified = False
            for item in entries:
                res = item.get('editor', {}).get('resource', '')
                opts = item.get('editor', {}).get('options', {})
                override = opts.get('override')
                if res.endswith('.md') and override in ['default', 'cweijan.markdownViewer']:
                    if 'implementation_plan' not in res.lower() and 'brain' not in res.lower():
                        opts['override'] = 'drview.mdViewer'
                        modified = True
            if modified:
                cur.execute("UPDATE ItemTable SET value = ? WHERE key = 'history.entries'", (json.dumps(entries),))
                conn.commit()
        conn.close()
    except Exception:
        pass
