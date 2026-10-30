#!/usr/bin/env node
/**
 * drview-doctor.cjs
 * 
 * DoctorBank DrView & IDE Editor Associations Sentinel & Self-Healing Engine.
 * 
 * Features:
 * 1. Checks and enforces default editor associations in Antigravity IDE and VS Code:
 *    - Markdown (.md) -> drview.mdViewer
 *    - Images (.png, .jpg, .webp, .svg, etc.) -> drview.imageViewer
 *    - Videos (.mp4, .mov, .webm, etc.) -> drview.videoViewer
 *    - Implementation Plans & Artifacts -> antigravity.artifactEditor (Proceed button & Comments)
 *    - Spreadsheets (.xlsx, .xls, .csv) -> cweijan.officeViewer
 * 2. Neutralizes Office Viewer (cweijan.vscode-office) markdown hijacking.
 * 3. Syncs and audits the DrView extension runtime bridge.
 * 
 * Usage:
 *   node tools/drview-doctor.cjs          # Auto-audit & fix
 *   node tools/drview-doctor.cjs --check  # Audit only (read-only)
 *   node tools/drview-doctor.cjs --fix    # Force repair & sync
 */

const fs = require('fs');
const path = require('path');

const isCheckOnly = process.argv.includes('--check') || process.argv.includes('--status');
const forceFix = process.argv.includes('--fix') || !isCheckOnly;

const userProfile = process.env.USERPROFILE || 'C:\\Users\\Admin';
const appData = process.env.APPDATA || path.join(userProfile, 'AppData', 'Roaming');

const EXTENSION_DIRS = [
  path.join(userProfile, '.antigravity-ide', 'extensions'),
  path.join(userProfile, '.antigravity', 'extensions'),
  path.join(userProfile, '.vscode', 'extensions')
];

const SETTINGS_PATHS = [
  { name: 'Antigravity IDE', path: path.join(appData, 'Antigravity IDE', 'User', 'settings.json') },
  { name: 'VS Code (Code)', path: path.join(appData, 'Code', 'User', 'settings.json') }
];

const DESIRED_ASSOCIATIONS = {
  // 1. Implementation Plans & Brain Artifacts (Antigravity Native Artifact Viewer)
  "**/.gemini/**/brain/**/*.md": "antigravity.artifactEditor",
  "**/brain/**/*.md": "antigravity.artifactEditor",
  "*implementation_plan*.md": "antigravity.artifactEditor",
  "**/implementation_plan*.md": "antigravity.artifactEditor",
  "**/Implementation_Plan*.md": "antigravity.artifactEditor",
  "*plan*.md": "antigravity.artifactEditor",
  "antigravity:/**/*.md": "antigravity.artifactEditor",
  "jetski-artifact:/**/*.md": "antigravity.artifactEditor",

  // 2. Regular Markdown Documents (DrView Full TOC & Table Viewer)
  "*.md": "drview.mdViewer",

  // 3. Images (DrView Image Studio - Filmstrip & Session Scope)
  "*.png": "drview.imageViewer",
  "*.jpg": "drview.imageViewer",
  "*.jpeg": "drview.imageViewer",
  "*.webp": "drview.imageViewer",
  "*.gif": "drview.imageViewer",
  "*.svg": "drview.imageViewer",
  "*.bmp": "drview.imageViewer",
  "*.ico": "drview.imageViewer",
  "*.avif": "drview.imageViewer",

  // 4. Videos (DrView Video Studio - VLC 200% Super Boost & Capsule Dock)
  "*.mp4": "drview.videoViewer",
  "*.mov": "drview.videoViewer",
  "*.webm": "drview.videoViewer",
  "*.mkv": "drview.videoViewer",
  "*.m4v": "drview.videoViewer",
  "*.avi": "drview.videoViewer",

  // 5. Excel / Spreadsheets (Office Viewer)
  "*.xlsx": "cweijan.officeViewer",
  "*.xls": "cweijan.officeViewer",
  "*.csv": "cweijan.officeViewer"
};

console.log("==========================================================");
console.log("🩺 DoctorBank DrView & Artifact Viewer Sentinel (V1.0)");
console.log("==========================================================");
console.log(`Mode: ${isCheckOnly ? '🔍 AUDIT ONLY' : '🛠️ AUDIT & AUTO-FIX'}`);
console.log(`User Profile: ${userProfile}`);

let issuesFound = 0;
let issuesFixed = 0;

// Step 1: Scan and neutralize Office Viewer extensions
console.log("\n📦 [1/3] Checking Office Viewer (cweijan.vscode-office)...");
for (const extDir of EXTENSION_DIRS) {
  if (!fs.existsSync(extDir)) continue;

  const entries = fs.readdirSync(extDir, { withFileTypes: true });
  for (const entry of entries) {
    const isDirOrLink = entry.isDirectory() || entry.isSymbolicLink();
    if (isDirOrLink && entry.name.toLowerCase().startsWith('cweijan.vscode-office')) {
      const pkgPath = path.join(extDir, entry.name, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const raw = fs.readFileSync(pkgPath, 'utf8');
          const pkg = JSON.parse(raw);
          let modified = false;

          if (pkg.contributes && Array.isArray(pkg.contributes.customEditors)) {
            for (const editor of pkg.contributes.customEditors) {
              if (editor.viewType === 'cweijan.markdownViewer') {
                const hasMd = editor.selector && editor.selector.some(s => s.filenamePattern && s.filenamePattern.includes('.md'));
                if (hasMd && (!editor.selector[0] || editor.selector[0].filenamePattern !== '*.disabled_office_md')) {
                  issuesFound++;
                  console.log(`  ⚠️ Active markdown selector detected in ${entry.name}`);
                  if (forceFix) {
                    editor.selector = [{ filenamePattern: '*.disabled_office_md' }];
                    modified = true;
                  }
                }
              }
            }
          }

          if (modified) {
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t'), 'utf8');
            console.log(`  ✅ Neutralized markdown hijacking in ${entry.name}`);
            issuesFixed++;
          } else {
            console.log(`  ✅ ${entry.name} is safely neutralized`);
          }
        } catch (e) {
          console.error(`  ❌ Error processing ${pkgPath}:`, e.message);
        }
      }
    }
  }
}

// Step 2: Check and update settings.json files
console.log("\n⚙️ [2/3] Checking workbench.editorAssociations in settings.json...");
for (const item of SETTINGS_PATHS) {
  const settingsPath = item.path;
  if (!fs.existsSync(settingsPath)) {
    console.log(`  ℹ️ ${item.name} not found at ${settingsPath} (skipping)`);
    continue;
  }

  try {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(raw);
    if (!settings['workbench.editorAssociations']) {
      settings['workbench.editorAssociations'] = {};
    }
    const assoc = settings['workbench.editorAssociations'];
    let changed = false;

    // Check obsolete preview associations
    for (const [key, val] of Object.entries(assoc)) {
      if (val === 'vscode.markdown.preview.editor') {
        issuesFound++;
        console.log(`  ⚠️ Obsolete association found: '${key}' -> '${val}'`);
        if (forceFix) {
          delete assoc[key];
          changed = true;
          issuesFixed++;
        }
      }
    }

    // Check desired associations
    for (const [pattern, targetEditor] of Object.entries(DESIRED_ASSOCIATIONS)) {
      if (assoc[pattern] !== targetEditor) {
        issuesFound++;
        console.log(`  ⚠️ Missing or mismatched: '${pattern}' (current: '${assoc[pattern] || 'none'}', expected: '${targetEditor}')`);
        if (forceFix) {
          assoc[pattern] = targetEditor;
          changed = true;
          issuesFixed++;
        }
      }
    }

    if (changed && forceFix) {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf8');
      console.log(`  ✅ Updated ${item.name} settings successfully!`);
    } else if (!changed) {
      console.log(`  ✅ ${item.name} associations are 100% compliant!`);
    }
  } catch (e) {
    console.error(`  ❌ Error reading/writing ${settingsPath}:`, e.message);
  }
}

// Step 3: Check DrView extension installation & Artifact Bridge
console.log("\n🔍 [3/3] Checking DrView Extension Installation...");
let drViewFound = false;
for (const extDir of EXTENSION_DIRS) {
  if (!fs.existsSync(extDir)) continue;
  const entries = fs.readdirSync(extDir, { withFileTypes: true });
  for (const entry of entries) {
    const isDirOrLink = entry.isDirectory() || entry.isSymbolicLink();
    if (isDirOrLink && entry.name.toLowerCase().startsWith('doctorbank.drview')) {
      drViewFound = true;
      console.log(`  ✅ Found DrView: ${entry.name} in ${extDir}`);
      
      // Check artifact bridge in mdViewerProvider.js
      const mdProviderPath = path.join(extDir, entry.name, 'src', 'mdViewerProvider.js');
      if (fs.existsSync(mdProviderPath)) {
        const src = fs.readFileSync(mdProviderPath, 'utf8');
        if (src.includes('openArtifactView')) {
          console.log(`  ✅ DrView Artifact Bridge: Active (🚀 Artifact button enabled)`);
        } else {
          console.log(`  ℹ️ DrView Artifact Bridge: Not present in this version`);
        }
      }
    }
  }
}

if (!drViewFound) {
  console.log(`  ⚠️ DrView extension not found in extension directories!`);
}

console.log("\n==========================================================");
if (issuesFound === 0) {
  console.log("🎉 ALL SYSTEMS GREEN: DrView & Artifact Viewer are in perfect harmony!");
} else if (forceFix) {
  console.log(`🛠️ REPAIR COMPLETE: Fixed ${issuesFixed}/${issuesFound} issue(s). Everything is now optimal.`);
} else {
  console.log(`⚠️ AUDIT COMPLETE: Found ${issuesFound} issue(s). Run 'node tools/drview-doctor.cjs --fix' to repair.`);
}
console.log("==========================================================\n");
