let sources = [];
let currentSource = null;
let panzoomInstance1 = null;
let panzoomInstance2 = null;

// Editor State
let currentFilePath = '';
let currentFileContent = '';
let isEditMode = false;
let currentEditorType = 'textarea';
let monacoEditorInstance = null;
let autoSaveTimer = null;
const AUTO_SAVE_DELAY_MS = 5000;

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    // Init Monaco Editor
    if (window.require) {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
        require(['vs/editor/editor.main'], function() {
            monacoEditorInstance = monaco.editor.create(document.getElementById('monaco-container'), {
                value: '',
                language: 'markdown',
                theme: 'vs-dark',
                automaticLayout: true,
                wordWrap: 'on',
                minimap: { enabled: false }
            });
            monacoEditorInstance.onDidChangeModelContent(() => {
                if (isEditMode && currentEditorType === 'monaco') {
                    handleInput();
                }
            });
        });
    }

    await fetchSources();
    if (sources.length > 0) {
        const lastSourceId = localStorage.getItem('lazyread_last_source');
        if (lastSourceId && sources.find(s => s.id === lastSourceId)) {
            document.getElementById('source-select').value = lastSourceId;
            selectSource(lastSourceId);
        } else {
            selectSource(sources[0].id);
        }
        
        // Open last file
        const lastFile = localStorage.getItem('lazyread_last_file');
        if (lastFile) {
            try {
                const lf = JSON.parse(lastFile);
                if (lf && lf.path) {
                    setTimeout(() => openFile(lf.path, lf.name), 100);
                }
            } catch(e){}
        }
    }
    
    document.getElementById('source-select').addEventListener('change', (e) => {
        selectSource(e.target.value);
        localStorage.setItem('lazyread_last_source', e.target.value);
    });
    
    // Sidebar Resizer
    const savedWidth = localStorage.getItem('lazyread_sidebar_width');
    if (savedWidth) document.getElementById('sidebar').style.width = savedWidth;
    
    let isResizing = false;
    const resizer = document.getElementById('resizer');
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let newWidth = e.clientX;
        if (newWidth < 150) newWidth = 150;
        if (newWidth > 800) newWidth = 800;
        document.getElementById('sidebar').style.width = newWidth + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            localStorage.setItem('lazyread_sidebar_width', document.getElementById('sidebar').style.width);
        }
    });
    
    // Outline Resizer
    const savedOutlineWidth = localStorage.getItem('lazyread_outline_width');
    if (savedOutlineWidth) {
        const op = document.getElementById('outlinePanel');
        if (op) op.style.width = savedOutlineWidth;
    }
    
    let isResizingOutline = false;
    const outlineResizer = document.getElementById('outline-resizer');
    if (outlineResizer) {
        outlineResizer.addEventListener('mousedown', (e) => {
            isResizingOutline = true;
            document.body.style.cursor = 'col-resize';
        });
    }
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizingOutline) return;
        // Width is from right edge, so: window.innerWidth - e.clientX
        let newWidth = window.innerWidth - e.clientX;
        if (newWidth < 150) newWidth = 150;
        if (newWidth > 600) newWidth = 600;
        document.getElementById('outlinePanel').style.width = newWidth + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizingOutline) {
            isResizingOutline = false;
            document.body.style.cursor = 'default';
            localStorage.setItem('lazyread_outline_width', document.getElementById('outlinePanel').style.width);
        }
    });
});

async function fetchSources() {
    try {
        const res = await fetch('/api/sources');
        const data = await res.json();
        sources = data.sources || [];
        
        // Old select (hidden but kept for compat)
        const select = document.getElementById('source-select');
        select.innerHTML = '';
        sources.forEach(src => {
            const opt = document.createElement('option');
            opt.value = src.id;
            opt.textContent = src.name;
            select.appendChild(opt);
        });
        
        // New source tabs
        renderSourceTabs();
    } catch (e) {
        console.error("Failed to fetch sources", e);
    }
}

function renderSourceTabs() {
    const container = document.getElementById('source-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    sources.forEach(src => {
        const tab = document.createElement('button');
        tab.className = 'source-tab' + (currentSource && currentSource.id === src.id ? ' active' : '');
        tab.textContent = src.name;
        tab.title = src.name;
        tab.onclick = () => {
            selectSource(src.id);
            document.querySelectorAll('.source-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        };
        container.appendChild(tab);
    });
    
    const addBtn = document.createElement('button');
    addBtn.className = 'source-tab-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add Local Folder';
    addBtn.onclick = addLocalFolder;
    container.appendChild(addBtn);
}

function selectSource(id) {
    currentSource = sources.find(s => s.id === id);
    if (!currentSource) return;
    
    document.getElementById('tree-container').innerHTML = '';
    
    if (currentSource.type === 'local') {
        currentSource.roots.forEach(root => {
            renderTreeRoot(root.name, root.path);
        });
    } else if (currentSource.type === 'vps') {
        renderTreeRoot("VPS Cloud", "");
        fetch(currentSource.apiUrl + '/seed', { method: 'POST' });
    }
}

// --- Tree Rendering ---

function getFileIconClass(name, isDir) {
    if (isDir) return 'fi-folder';
    const ext = name.split('.').pop().toLowerCase();
    const map = {
        'md': 'fi-md', 'markdown': 'fi-md',
        'html': 'fi-html', 'htm': 'fi-html',
        'js': 'fi-js', 'mjs': 'fi-js', 'ts': 'fi-js', 'tsx': 'fi-js', 'jsx': 'fi-js',
        'json': 'fi-json', 'jsonc': 'fi-json',
        'css': 'fi-css', 'scss': 'fi-css', 'less': 'fi-css',
        'png': 'fi-img', 'jpg': 'fi-img', 'jpeg': 'fi-img', 'gif': 'fi-img', 'svg': 'fi-img', 'webp': 'fi-img', 'ico': 'fi-img',
    };
    return map[ext] || 'fi-other';
}

function getFileIconText(name, isDir, expanded) {
    if (isDir) return expanded ? '<i class="ri-folder-open-fill"></i>' : '<i class="ri-folder-fill"></i>';
    const ext = name.split('.').pop().toLowerCase();
    const map = {
        'md': '<i class="ri-markdown-fill"></i>', 'markdown': '<i class="ri-markdown-fill"></i>',
        'html': '<i class="ri-html5-fill"></i>', 'htm': '<i class="ri-html5-fill"></i>',
        'js': '<i class="ri-javascript-fill"></i>', 'mjs': '<i class="ri-javascript-fill"></i>', 'ts': '<i class="ri-javascript-fill"></i>', 'tsx': '<i class="ri-reactjs-fill"></i>', 'jsx': '<i class="ri-reactjs-fill"></i>',
        'json': '<i class="ri-brackets-fill"></i>', 'jsonc': '<i class="ri-brackets-fill"></i>',
        'css': '<i class="ri-css3-fill"></i>', 'scss': '<i class="ri-css3-fill"></i>', 'less': '<i class="ri-css3-fill"></i>',
        'png': '<i class="ri-image-fill"></i>', 'jpg': '<i class="ri-image-fill"></i>', 'jpeg': '<i class="ri-image-fill"></i>', 'gif': '<i class="ri-image-fill"></i>', 'svg': '<i class="ri-image-fill"></i>', 'webp': '<i class="ri-image-fill"></i>', 'ico': '<i class="ri-image-fill"></i>',
    };
    return map[ext] || '<i class="ri-file-text-fill"></i>';
}

function setBreadcrumb(filePath) {
    const el = document.getElementById('current-file-name');
    if (!el) return;
    // Normalize path separators
    const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
    // Show last 4 segments max
    const shown = parts.slice(-4);
    el.innerHTML = shown.map((seg, i) => {
        const partialIdx = parts.length - shown.length + i;
        const partialPath = parts.slice(0, partialIdx + 1).join('/');
        return `<span class="breadcrumb-seg" style="cursor:pointer;" onclick="navigator.clipboard.writeText('${partialPath.replace(/'/g, "\\'")}'); this.style.color='var(--success)'; setTimeout(()=>this.style.color='', 500);" title="Click to copy path: ${partialPath.replace(/'/g, "&apos;")}">${seg}</span>` +
            (i < shown.length - 1 ? '<span class="breadcrumb-arrow">›</span>' : '');
    }).join('');
}

function collapseAll() {
    document.querySelectorAll('.tree-children.expanded').forEach(el => {
        el.classList.remove('expanded');
    });
    document.querySelectorAll('.tree-node.expanded').forEach(el => {
        el.classList.remove('expanded');
        const icon = el.querySelector('.tree-icon.fi-folder');
        if (icon) icon.innerHTML = '<i class="ri-folder-fill"></i>';
    });
}

function renderTreeRoot(name, pathStr) {
    const container = document.getElementById('tree-container');
    
    const rootEl = document.createElement('div');
    rootEl.className = 'tree-node';
    rootEl.innerHTML = `<span class="tree-chevron"><i class="ri-arrow-right-s-line"></i></span><span class="tree-icon fi-folder">${getFileIconText(name, true, false)}</span><span class="tree-label" title="${name}">${name}</span>`;
    rootEl.dataset.path = pathStr;
    rootEl.dataset.loaded = "false";
    
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    
    rootEl.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (rootEl.dataset.loaded === "false") {
            await loadDir(pathStr, childrenContainer);
            rootEl.dataset.loaded = "true";
        }
        rootEl.classList.toggle('expanded');
        childrenContainer.classList.toggle('expanded');
        const icon = rootEl.querySelector('.tree-icon');
        icon.innerHTML = getFileIconText(name, true, rootEl.classList.contains('expanded'));
    });
    
    container.appendChild(rootEl);
    container.appendChild(childrenContainer);
}

async function loadDir(dirPath, container) {
    try {
        const apiBase = currentSource.type === 'local' ? '/api/local' : currentSource.apiUrl;
        const res = await fetch(`${apiBase}/list?path=${encodeURIComponent(dirPath)}`);
        const items = await res.json();
        
        container.innerHTML = '';
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'tree-node';
            el.innerHTML = `<span class="tree-chevron" ${!item.isDirectory ? 'style="visibility:hidden"' : ''}><i class="ri-arrow-right-s-line"></i></span><span class="tree-icon ${getFileIconClass(item.name, item.isDirectory)}">${getFileIconText(item.name, item.isDirectory, false)}</span><span class="tree-label" title="${item.name}">${item.name}</span>`;
            el.title = item.path;
            
            if (item.isDirectory) {
                const subContainer = document.createElement('div');
                subContainer.className = 'tree-children';
                el.dataset.loaded = "false";
                
                el.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (el.dataset.loaded === "false") {
                        await loadDir(item.path, subContainer);
                        el.dataset.loaded = "true";
                    }
                    el.classList.toggle('expanded');
                    subContainer.classList.toggle('expanded');
                    el.querySelector('.tree-icon').innerHTML = getFileIconText(item.name, true, el.classList.contains('expanded'));
                });
                
                container.appendChild(el);
                container.appendChild(subContainer);
            } else {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Highlight selection
                    document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
                    el.classList.add('selected');
                    
                    openFile(item.path, item.name);
                });
                container.appendChild(el);
            }
        });
    } catch (e) {
        container.innerHTML = `<div style="padding-left:16px;color:red;">Error loading folder</div>`;
        console.error(e);
    }
}

// --- File Viewer ---

async function openFile(filePath, fileName, targetPanel = 1) {
    const isSplit = targetPanel === 2;
    
    if (!isSplit) {
        setBreadcrumb(filePath);
        currentFilePath = filePath;
        localStorage.setItem('lazyread_last_file', JSON.stringify({path: filePath, name: fileName}));
    } else {
        document.getElementById('panel2-title').textContent = fileName;
        document.getElementById('panel2').style.display = 'flex';
    }

    const containerId = isSplit ? 'pv2' : 'pv';
    const container = document.getElementById(containerId);
    container.innerHTML = 'Loading...';
    
    if (!isSplit) {
        document.getElementById('topbar-actions').style.display = 'none';
    }

    try {
        const apiBase = currentSource.type === 'local' ? '/api/local' : currentSource.apiUrl;
        const res = await fetch(`${apiBase}/read?path=${encodeURIComponent(filePath)}`);
        const data = await res.json();

        if (data.type === 'image') {
            container.innerHTML = `<div class="image-viewport"><img id="img-${containerId}" src="${data.content}" style="max-width:100%;max-height:100%;object-fit:contain;"></div>`;
            const img = document.getElementById(`img-${containerId}`);
            if (window.Panzoom) {
                const pz = Panzoom(img, { maxScale: 10, contain: 'outside' });
                img.parentElement.addEventListener('wheel', pz.zoomWithWheel);
                img.addEventListener('dblclick', () => pz.reset());
                if (isSplit) panzoomInstance2 = pz; else panzoomInstance1 = pz;
            }
        } else {
            if (!isSplit) {
                currentFileContent = data.content;
                document.getElementById('topbar-actions').style.display = 'block';
                if (isEditMode) {
                    if (currentEditorType === 'monaco' && monacoEditorInstance) {
                        monacoEditorInstance.setValue(currentFileContent);
                    } else {
                        document.getElementById('editor').value = currentFileContent;
                    }
                }
            }
            const ext = filePath.split('.').pop().toLowerCase();
            if (ext === 'md' || ext === 'markdown') {
                if (window.marked) {
                    let parsedBody = marked.parse(data.content);
                    parsedBody = parsedBody.replace(/<li>\s*\[ \]\s*/gi, '<li class="task-list-item"><input type="checkbox" class="drview-task-checkbox" disabled> ')
                                           .replace(/<li>\s*\[x\]\s*/gi, '<li class="task-list-item"><input type="checkbox" class="drview-task-checkbox" checked disabled> ');
                    container.innerHTML = parsedBody;
                    // Call viewer.js init if exists
                    if (typeof initViewer === 'function' && !isSplit) {
                        setTimeout(() => initViewer(), 50); // Give DOM time to update
                    }
                    interceptLinks(container);
                } else {
                    container.innerHTML = `<pre>${escapeHtml(data.content)}</pre>`;
                }
            } else {
                container.innerHTML = `<pre style="padding:20px;margin:0;"><code>${escapeHtml(data.content)}</code></pre>`;
            }
            if (!isSplit) {
                updateStats(data.content);
            }
        }
    } catch (e) {
        container.innerHTML = `<div style="color:red;">Error reading file: ${e.message}</div>`;
    }
}

function closeSplitView() {
    document.getElementById('panel2').style.display = 'none';
}

// --- Editor Functions ---

function switchEditorType() {
    currentEditorType = document.getElementById('editor-type').value;
    const textarea = document.getElementById('editor');
    const monacoDiv = document.getElementById('monaco-container');
    
    if (currentEditorType === 'monaco') {
        textarea.style.display = 'none';
        if (isEditMode) monacoDiv.style.display = 'block';
        if (monacoEditorInstance) {
            monacoEditorInstance.setValue(textarea.value);
        }
    } else {
        if (isEditMode) textarea.style.display = 'block';
        monacoDiv.style.display = 'none';
        if (monacoEditorInstance) {
            textarea.value = monacoEditorInstance.getValue();
        }
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const panelContent = document.getElementById('panel1-content');
    const textarea = document.getElementById('editor');
    const monacoDiv = document.getElementById('monaco-container');
    const btnEdit = document.getElementById('btn-edit');
    const btnSave = document.getElementById('btn-save');
    
    if (isEditMode) {
        panelContent.classList.add('edit-mode');
        
        if (currentEditorType === 'monaco') {
            if (monacoEditorInstance) monacoEditorInstance.setValue(currentFileContent);
            textarea.style.display = 'none';
            monacoDiv.style.display = 'block';
        } else {
            textarea.value = currentFileContent;
            textarea.style.display = 'block';
            monacoDiv.style.display = 'none';
        }
        
        btnEdit.textContent = 'View';
        btnSave.style.display = 'inline-block';
    } else {
        panelContent.classList.remove('edit-mode');
        textarea.style.display = 'none';
        monacoDiv.style.display = 'none';
        btnEdit.textContent = 'Edit';
        btnSave.style.display = 'none';
    }
}

function handleInput() {
    updatePreview();
    
    // Auto-save logic
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        if (isEditMode && currentFilePath) {
            saveFile();
        }
    }, AUTO_SAVE_DELAY_MS);
}

function updatePreview() {
    if (!isEditMode) return;
    
    let val = '';
    if (currentEditorType === 'monaco' && monacoEditorInstance) {
        val = monacoEditorInstance.getValue();
    } else {
        val = document.getElementById('editor').value;
    }
    
    const container = document.getElementById('pv');
    
    const ext = currentFilePath.split('.').pop().toLowerCase();
    if (ext === 'md' || ext === 'markdown') {
        if (window.marked) {
            let parsedBody = marked.parse(val);
            parsedBody = parsedBody.replace(/<li>\s*\[ \]\s*/gi, '<li class="task-list-item"><input type="checkbox" class="drview-task-checkbox" disabled> ')
                                   .replace(/<li>\s*\[x\]\s*/gi, '<li class="task-list-item"><input type="checkbox" class="drview-task-checkbox" checked disabled> ');
            container.innerHTML = parsedBody;
        } else {
            container.innerHTML = `<pre>${escapeHtml(val)}</pre>`;
        }
    } else {
        container.innerHTML = `<pre style="padding:20px;margin:0;"><code>${escapeHtml(val)}</code></pre>`;
    }
    
    updateStats(val);
}

function updateStats(text) {
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lines = text.split('\n').length;
    const readMin = Math.max(1, Math.ceil(words / 200));
    
    const wordsEl = document.getElementById('stat-words');
    const charsEl = document.getElementById('stat-chars');
    const linesEl = document.getElementById('stat-lines');
    const readEl = document.getElementById('stat-readtime');
    const ftEl = document.getElementById('stat-filetype');
    
    if (wordsEl) wordsEl.textContent = `Words: ${words.toLocaleString()}`;
    if (charsEl) charsEl.textContent = `Chars: ${chars.toLocaleString()}`;
    if (linesEl) linesEl.textContent = `Ln ${lines.toLocaleString()}`;
    if (readEl) readEl.textContent = `~${readMin} min`;
    
    if (ftEl && currentFilePath) {
        const ext = currentFilePath.split('.').pop().toLowerCase();
        const typeMap = { 'md': 'Markdown', 'markdown': 'Markdown', 'html': 'HTML', 'htm': 'HTML', 'js': 'JavaScript', 'json': 'JSON', 'css': 'CSS', 'txt': 'Text', 'png': 'Image', 'jpg': 'Image', 'svg': 'SVG' };
        ftEl.textContent = typeMap[ext] || ext.toUpperCase();
    }
}

async function saveFile() {
    if (!currentFilePath || !currentSource) return;
    
    let content = '';
    if (currentEditorType === 'monaco' && monacoEditorInstance) {
        content = monacoEditorInstance.getValue();
    } else {
        content = document.getElementById('editor').value;
    }
    const apiBase = currentSource.type === 'local' ? '/api/local' : currentSource.apiUrl;
    const statusEl = document.getElementById('save-status');
    const syncEl = document.getElementById('sync-status');
    
    try {
        if (statusEl) statusEl.textContent = 'Saving...';
        if (syncEl) {
            syncEl.style.display = 'inline-flex';
            syncEl.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> <span>Syncing...</span>';
            syncEl.style.color = 'var(--text-secondary)';
        }
        const res = await fetch(`${apiBase}/write`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentFilePath, content: content })
        });
        
        if (res.ok) {
            currentFileContent = content;
            if (statusEl) statusEl.textContent = 'Saved';
            if (syncEl) {
                syncEl.innerHTML = '<i class="ri-check-line"></i> <span>Synced</span>';
                syncEl.style.color = 'var(--success)';
                setTimeout(() => { if (syncEl) syncEl.style.color = 'var(--text-muted)'; }, 2500);
            }
        } else {
            if (statusEl) statusEl.textContent = 'Save Failed';
            if (syncEl) {
                syncEl.innerHTML = '<i class="ri-error-warning-line"></i> <span>Failed</span>';
                syncEl.style.color = '#ef4444'; /* red */
            }
        }
    } catch (e) {
        console.error(e);
        if (statusEl) statusEl.textContent = 'Save Error';
        if (syncEl) {
            syncEl.innerHTML = '<i class="ri-error-warning-line"></i> <span>Error</span>';
            syncEl.style.color = '#ef4444';
        }
    }
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (isEditMode && currentFilePath) {
            e.preventDefault();
            saveFile();
        }
    }
});

function interceptLinks(container) {
    const links = container.querySelectorAll('a');
    links.forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                e.preventDefault();
                // Determine absolute path based on current file...
                // For simplicity in this mock, we just alert or try to open if it's absolute
                const currentPath = document.getElementById('current-file-name').textContent;
                const dir = currentPath.substring(0, currentPath.lastIndexOf('/'));
                let targetPath = href;
                if (!targetPath.startsWith('/')) {
                    targetPath = dir + '/' + targetPath;
                }
                const targetName = targetPath.split('/').pop();
                
                if (e.ctrlKey || e.metaKey) {
                    openFile(targetPath, targetName, 2);
                } else {
                    openFile(targetPath, targetName, 1);
                }
            }
        });
    });
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function addLocalFolder() {
    const folderPath = prompt("Enter the absolute path of the folder you want to add (e.g., C:/MyFolder):");
    if (!folderPath) return;
    
    const name = prompt("Enter a display name for this folder (e.g., My Notes):") || "New Folder";
    
    try {
        const res = await fetch('/api/config/add-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, path: folderPath })
        });
        
        if (res.ok) {
            await fetchSources();
            if (currentSource) {
                document.getElementById('source-select').value = currentSource.id;
                selectSource(currentSource.id);
            }
        } else {
            alert("Failed to add folder.");
        }
    } catch (e) {
        console.error(e);
        alert("Error adding folder: " + e.message);
    }
}
