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
        selectSource(sources[0].id);
    }
    
    document.getElementById('source-select').addEventListener('change', (e) => {
        selectSource(e.target.value);
    });
});

async function fetchSources() {
    try {
        const res = await fetch('/api/sources');
        const data = await res.json();
        sources = data.sources || [];
        
        const select = document.getElementById('source-select');
        select.innerHTML = '';
        sources.forEach(src => {
            const opt = document.createElement('option');
            opt.value = src.id;
            opt.textContent = src.name;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Failed to fetch sources", e);
    }
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
        // Seed mock data
        fetch(currentSource.apiUrl + '/seed', { method: 'POST' });
    }
}

// --- Tree Rendering ---

function renderTreeRoot(name, pathStr) {
    const container = document.getElementById('tree-container');
    
    const rootEl = document.createElement('div');
    rootEl.className = 'tree-node';
    rootEl.innerHTML = `<span class="tree-icon">📁</span> ${name}`;
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
        childrenContainer.classList.toggle('expanded');
        const icon = rootEl.querySelector('.tree-icon');
        icon.textContent = childrenContainer.classList.contains('expanded') ? '📂' : '📁';
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
            el.innerHTML = `<span class="tree-icon">${item.isDirectory ? '📁' : '📄'}</span> ${item.name}`;
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
                    subContainer.classList.toggle('expanded');
                    el.querySelector('.tree-icon').textContent = subContainer.classList.contains('expanded') ? '📂' : '📁';
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
        document.getElementById('current-file-name').textContent = filePath;
        currentFilePath = filePath;
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
                    container.innerHTML = marked.parse(data.content);
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
            container.innerHTML = marked.parse(val);
        } else {
            container.innerHTML = `<pre>${escapeHtml(val)}</pre>`;
        }
    } else {
        container.innerHTML = `<pre style="padding:20px;margin:0;"><code>${escapeHtml(val)}</code></pre>`;
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
    
    try {
        statusEl.textContent = 'Saving...';
        const res = await fetch(`${apiBase}/write`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentFilePath, content: content })
        });
        
        if (res.ok) {
            currentFileContent = content;
            statusEl.textContent = 'Saved!';
            setTimeout(() => { statusEl.textContent = ''; }, 2000);
        } else {
            const err = await res.json();
            statusEl.textContent = 'Error: ' + (err.error || 'Failed to save');
        }
    } catch (e) {
        statusEl.textContent = 'Error: ' + e.message;
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
