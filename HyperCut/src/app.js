/**
 * HyperCut AI — Main Application
 * Architecture: Isolated State Modules per Section
 * Each module manages its own state, DOM references, and event listeners.
 * Modules communicate via a shared lightweight event bus, NOT by reaching
 * into each other's internals. This prevents cascading failures.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════════════════════
    // SHARED: Lightweight Event Bus (cross-module communication)
    // ═══════════════════════════════════════════════════════════
    const EventBus = {
        _listeners: {},
        on(event, fn)   { (this._listeners[event] ||= []).push(fn); },
        off(event, fn)  { this._listeners[event] = (this._listeners[event] || []).filter(f => f !== fn); },
        emit(event, data) { (this._listeners[event] || []).forEach(fn => { try { fn(data); } catch(e) { console.error(`[EventBus] Error in ${event}:`, e); } }); }
    };

    // ═══════════════════════════════════════════════════════════
    // SHARED: Utility Functions
    // ═══════════════════════════════════════════════════════════
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function getActivePreset() {
        const card = document.querySelector('.preset-card.active');
        return card ? (card.getAttribute('data-preset') || 'flow') : 'flow';
    }


    // ═══════════════════════════════════════════════════════════
    // MODULE 1: Tab Navigation
    // ═══════════════════════════════════════════════════════════
    (function initTabNav() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const pages   = document.querySelectorAll('.page');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                pages.forEach(p => {
                    // special handling to ensure grid layout triggers reflow if needed, but display:none is fine
                    if (p.style.display !== 'none') p.style.display = 'none';
                });
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-target');
                const target = document.getElementById(targetId);
                if (target) target.style.display = 'block';
            });
        });

        EventBus.on('switch-tab', (tabId) => {
            const btn = Array.from(tabBtns).find(b => b.getAttribute('data-target') === tabId);
            if (btn) btn.click();
        });
    })();


    // ═══════════════════════════════════════════════════════════
    // MODULE 2: Preset Selection
    // ═══════════════════════════════════════════════════════════
    (function initPresetSelector() {
        const presetCards = document.querySelectorAll('.preset-card');

        presetCards.forEach(card => {
            card.addEventListener('click', () => {
                const preset = card.getAttribute('data-preset');
                if (preset === 'custom') return; // TODO: custom preset dialog

                presetCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                // Broadcast to other modules
                EventBus.emit('preset-changed', preset);
            });
        });
    })();


    // ═══════════════════════════════════════════════════════════
    // MODULE 3: Video Loader (Drag & Drop + Browse)
    // ═══════════════════════════════════════════════════════════
    (function initVideoLoader() {
        const state = { videoPath: null };

        function loadVideo(filePath) {
            const normalizedPath = filePath.replace(/\\/g, '/');
            state.videoPath = filePath;
            console.log('[VideoLoader] Loaded:', filePath);

            // Use the persistent <video> in the DOM - NEVER rewrite innerHTML
            const video = document.getElementById('main-video');
            const dropZone = document.getElementById('drop-zone');

            if (video) {
                video.src = 'file:///' + normalizedPath;
                video.controls = true;
                video.style.display = 'block';
            }
            if (dropZone) dropZone.style.display = 'none';

            // Broadcast to other modules
            EventBus.emit('video-loaded', filePath);
        }

        // Drag & Drop (global)
        document.addEventListener('dragenter', e => { e.preventDefault(); e.stopPropagation(); });
        document.addEventListener('dragover',  e => {
            e.preventDefault(); e.stopPropagation();
            const dz = document.getElementById('drop-zone');
            if (dz) dz.classList.add('drag-over');
            const cdz = document.getElementById('cut-drop-zone');
            if (cdz) cdz.classList.add('drag-over');
        });
        document.addEventListener('dragleave', e => {
            e.preventDefault(); e.stopPropagation();
            const dz = document.getElementById('drop-zone');
            if (dz) dz.classList.remove('drag-over');
            const cdz = document.getElementById('cut-drop-zone');
            if (cdz) cdz.classList.remove('drag-over');
        });
        document.addEventListener('drop', e => {
            e.preventDefault(); e.stopPropagation();
            const dz = document.getElementById('drop-zone');
            if (dz) dz.classList.remove('drag-over');
            const cdz = document.getElementById('cut-drop-zone');
            if (cdz) cdz.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (!files || files.length === 0) return;
            const file = files[0];
            const isVideo = file.type.startsWith('video/') || /\.(mp4|mkv|mov|webm|avi)$/i.test(file.name);
            if (isVideo) loadVideo(file.path);
            else alert('กรุณาเลือกไฟล์วิดีโอ (mp4, mkv, mov, webm, avi)');
        });

        // Click to browse
        const browseBtn = document.getElementById('browse-btn');
        const cutBrowseBtn = document.getElementById('cut-browse-btn');
        
        const browseHandler = async (e) => {
            e.stopPropagation();
            if (!window.electronAPI) { alert('electronAPI not available'); return; }
            const filePath = await window.electronAPI.openFileDialog();
            if (filePath) loadVideo(filePath);
        };

        if (browseBtn) browseBtn.addEventListener('click', browseHandler);
        if (cutBrowseBtn) cutBrowseBtn.addEventListener('click', browseHandler);

        // Listen for video path changes from other modules (e.g. Cut Silence produces new file)
        EventBus.on('video-path-updated', (newPath) => {
            loadVideo(newPath);
        });

        // Expose getter for other modules
        EventBus.on('get-video-path', (callback) => {
            callback(state.videoPath);
        });
    })();


    // ═══════════════════════════════════════════════════════════
    // MODULE 4: Transcript Panel
    // ═══════════════════════════════════════════════════════════
    (function initTranscriptPanel() {
        const state = { words: [] };
        const transcriptPanel = document.querySelector('.transcript-content');

        function renderTranscript() {
            const words = state.words;
            if (!words || words.length === 0) {
                transcriptPanel.innerHTML = `<div style="text-align:center; margin-top:50px; color:var(--text-secondary);">ยังไม่มีคำบรรยาย<br><span style="font-size:0.8rem;">กด Transcribe เพื่อเริ่ม</span></div>`;
                return;
            }

            const presetName = getActivePreset();

            // Chunking rules per preset
            const MAX_WORDS = presetName === 'hormozi' ? 1 : (presetName === 'flow' ? 4 : 10);
            let chunks = [];
            let currentChunk = [];

            words.forEach((w, i) => {
                currentChunk.push(w);
                const nextWord = words[i + 1];
                if (currentChunk.length >= MAX_WORDS || (nextWord && nextWord.start - w.end > 0.5)) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                }
            });
            if (currentChunk.length > 0) chunks.push(currentChunk);

            let html = '';
            chunks.forEach((chunk, idx) => {
                const startStr   = formatTime(chunk[0].start);
                const chunkStart = chunk[0].start;
                const chunkEnd   = chunk[chunk.length - 1].end;

                // Join Thai words — no spaces (ภาษาไทยไม่ใช้ spacebar)
                const joinedText = chunk.map(w => w.word).join('');

                // Store per-word timing as JSON in data attr for accurate re-sync later
                const wordTimings = JSON.stringify(chunk.map(w => ({ s: w.start, e: w.end, t: w.word })));

                html += `
                    <div class="transcript-line chunk-line" 
                         data-start="${chunkStart}" 
                         data-end="${chunkEnd}"
                         data-chunk-idx="${idx}">
                        <span class="time">${startStr}</span>
                        <div class="chunk-text"
                             contenteditable="true"
                             data-timings="${encodeURIComponent(wordTimings)}"
                             data-chunk-start="${chunkStart}"
                             data-chunk-end="${chunkEnd}">${joinedText}</div>
                    </div>
                `;
            });

            html += `<button class="btn" id="save-edits-btn" style="margin-top:20px; width:100%;">📝 Save Edits</button>`;
            transcriptPanel.innerHTML = html;

            // --- Wire events ---

            // Click timestamp → seek video
            transcriptPanel.querySelectorAll('.chunk-line .time').forEach(timeEl => {
                timeEl.addEventListener('click', () => {
                    const video = document.querySelector('video');
                    if (video) {
                        video.currentTime = parseFloat(timeEl.parentElement.getAttribute('data-start'));
                        video.play();
                    }
                });
            });

            // Visual flair on editable chunk
            transcriptPanel.querySelectorAll('.chunk-text').forEach(el => {
                el.addEventListener('focus', () => el.classList.add('editing'));
                el.addEventListener('blur',  () => el.classList.remove('editing'));
            });

            // Save Edits button
            const saveBtn = document.getElementById('save-edits-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    syncWordsFromDOM();
                    saveBtn.textContent = '✅ Saved!';
                    setTimeout(() => saveBtn.textContent = '📝 Save Edits', 2000);
                });
            }
        }

        function syncWordsFromDOM() {
            // Re-build word array from chunk-text divs
            // If user edited text, we distribute the timing proportionally across the chunk duration
            const chunkEls = transcriptPanel.querySelectorAll('.chunk-text');
            const newWords = [];

            chunkEls.forEach(el => {
                const editedText = el.textContent.trim();
                const chunkStart = parseFloat(el.getAttribute('data-chunk-start'));
                const chunkEnd   = parseFloat(el.getAttribute('data-chunk-end'));

                // Try to restore original per-word timings if text wasn't changed
                let original = [];
                try { original = JSON.parse(decodeURIComponent(el.getAttribute('data-timings'))); } catch(e) {}

                const originalJoined = original.map(w => w.t).join('');

                if (editedText === originalJoined && original.length > 0) {
                    // Text unchanged — keep original per-word timings
                    original.forEach(w => newWords.push({ start: w.s, end: w.e, word: w.t }));
                } else {
                    // Text was edited — treat whole chunk as one word with chunk timing
                    if (editedText) newWords.push({ start: chunkStart, end: chunkEnd, word: editedText });
                }
            });

            state.words = newWords;
        }

        function showStatus(msg, color = 'var(--accent)') {
            transcriptPanel.innerHTML = `<div style="text-align:center; margin-top:50px; color:${color};">${msg}</div>`;
        }

        // Listen for transcription results
        EventBus.on('transcribe-result', (words) => {
            state.words = words;
            renderTranscript();
        });

        // Listen for preset changes → re-render with new grouping
        EventBus.on('preset-changed', () => {
            if (state.words.length > 0) renderTranscript();
        });

        // Expose status updater and word getter for other modules
        EventBus.on('show-transcript-status', ({ msg, color }) => showStatus(msg, color));
        EventBus.on('get-transcript-words', (callback) => {
            syncWordsFromDOM();
            callback(state.words);
        });
    })();


    // ═══════════════════════════════════════════════════════════
    // MODULE 5: Transcription (AI call)
    // ═══════════════════════════════════════════════════════════
    (function initTranscription() {
        const transcribeBtn = document.getElementById('transcribe-btn');
        if (!transcribeBtn) return;

        if (window.electronAPI) {
            window.electronAPI.onTranscribeProgress((data) => {
                const pct = data.progress ? ` (${data.progress}%)` : '';
                EventBus.emit('show-transcript-status', { msg: `${data.status}${pct}` });
            });
        }

        transcribeBtn.addEventListener('click', async () => {
            let videoPath = null;
            EventBus.emit('get-video-path', (p) => { videoPath = p; });

            if (!videoPath) { alert('กรุณาเลือกไฟล์วิดีโอก่อน!'); return; }
            if (!window.electronAPI) { alert('Mock: Transcribing ' + videoPath); return; }

            transcribeBtn.disabled = true;
            transcribeBtn.textContent = '⏳ Transcribing...';
            EventBus.emit('show-transcript-status', { msg: 'Initialize AI...' });

            try {
                const response = await window.electronAPI.transcribe(videoPath);
                if (response.success) {
                    EventBus.emit('transcribe-result', response.data.words);
                } else {
                    alert('Error: ' + response.error);
                    EventBus.emit('show-transcript-status', { msg: `Failed: ${response.error}`, color: 'red' });
                }
            } catch (err) {
                alert('Transcription crashed: ' + err.message);
                EventBus.emit('show-transcript-status', { msg: `Crash: ${err.message}`, color: 'red' });
            } finally {
                transcribeBtn.disabled = false;
                transcribeBtn.textContent = '🎤 Transcribe';
            }
        });
    })();


    // ═══════════════════════════════════════════════════════════
    // MODULE 6: Cut Silence (Redirects to Cut Lab)
    // ═══════════════════════════════════════════════════════════
    (function initCutSilence() {
        const cutBtn = document.getElementById('cut-silence-btn');
        if (!cutBtn) return;

        cutBtn.addEventListener('click', () => {
            let videoPath = null;
            EventBus.emit('get-video-path', (p) => { videoPath = p; });
            if (!videoPath) { alert('กรุณาเลือกไฟล์วิดีโอก่อน!'); return; }
            
            // Switch to Cut Lab tab
            EventBus.emit('switch-tab', 'cut-lab');
        });
    })();


    // ═══════════════════════════════════════════════════════════
    // MODULE 7: Render Video (HyperFrames)
    // ═══════════════════════════════════════════════════════════
    (function initRenderVideo() {
        const renderBtn = document.getElementById('render-btn');
        if (!renderBtn) return;

        if (window.electronAPI) {
            window.electronAPI.onRenderProgress((data) => {
                EventBus.emit('show-transcript-status', { msg: `🎬 ${data.status}`, color: '#FFDE59' });
            });
        }

        renderBtn.addEventListener('click', async () => {
            let videoPath = null;
            EventBus.emit('get-video-path', (p) => { videoPath = p; });
            if (!videoPath) { alert('กรุณาเลือกไฟล์วิดีโอก่อน!'); return; }

            let words = [];
            EventBus.emit('get-transcript-words', (w) => { words = w; });
            if (words.length === 0) { alert('ยังไม่มีคำบรรยาย กรุณา Transcribe ก่อน'); return; }

            const presetName = getActivePreset();

            let styleConfig = null;
            EventBus.emit('get-style-config', (s) => { styleConfig = s; });

            renderBtn.disabled = true;
            renderBtn.textContent = '⏳ Rendering...';
            EventBus.emit('show-transcript-status', { msg: 'Initializing HyperFrames Renderer...', color: '#FFDE59' });

            try {
                const response = await window.electronAPI.renderVideo({
                    videoPath,
                    preset: presetName,
                    words,
                    style: styleConfig
                });

                if (response.success) {
                    EventBus.emit('show-transcript-status', {
                        msg: `Render Complete in ${response.elapsed}s! 🎉<br><span style="font-size:0.8rem;color:var(--text-secondary);word-break:break-all;">${response.outputPath}</span>`,
                        color: '#4ade80'
                    });
                    EventBus.emit('video-path-updated', response.outputPath);
                } else {
                    alert('Render error: ' + response.error);
                    EventBus.emit('show-transcript-status', { msg: `Render Failed: ${response.error}`, color: 'red' });
                }
            } catch (err) {
                alert('Render crashed: ' + err.message);
            } finally {
                renderBtn.disabled = false;
                renderBtn.textContent = '🎬 Render';
            }
        });
    })();


    // ═══════════════════════════════════════════════════════════
    // MODULE 8: Export / Import Transcript
    // ═══════════════════════════════════════════════════════════
    (function initTranscriptIO() {

        // ── EXPORT ──────────────────────────────────────────────
        const exportBtn = document.getElementById('export-transcript-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                let words = [];
                EventBus.emit('get-transcript-words', (w) => { words = w; });

                if (words.length === 0) {
                    alert('ยังไม่มี Transcript ให้ Export\nกรุณา Transcribe ก่อน');
                    return;
                }

                const payload = {
                    version: '1.0',
                    exportedAt: new Date().toISOString(),
                    wordCount: words.length,
                    words
                };

                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `hypercut_transcript_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);

                exportBtn.textContent = '✅ Exported!';
                setTimeout(() => { exportBtn.textContent = '💾 Export'; }, 2000);
            });
        }

        // ── IMPORT ──────────────────────────────────────────────
        const importBtn = document.getElementById('import-transcript-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                // Create a hidden file input
                const fileInput = document.createElement('input');
                fileInput.type   = 'file';
                fileInput.accept = '.json';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);

                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const data = JSON.parse(ev.target.result);

                            // Support both raw array and {words:[]} format
                            const words = Array.isArray(data) ? data : data.words;

                            if (!words || words.length === 0) {
                                alert('ไฟล์นี้ไม่มีข้อมูล words\nตรวจสอบ format อีกครั้ง');
                                return;
                            }

                            // Validate each word has required fields
                            const valid = words.every(w =>
                                typeof w.word  === 'string' &&
                                typeof w.start === 'number' &&
                                typeof w.end   === 'number'
                            );
                            if (!valid) {
                                alert('Format ไม่ถูกต้อง\nแต่ละ word ต้องมี { word, start, end }');
                                return;
                            }

                            // Fire into the system exactly like a real Transcribe result
                            EventBus.emit('transcribe-result', words);

                            importBtn.textContent = '✅ Imported!';
                            setTimeout(() => { importBtn.textContent = '📂 Import'; }, 2000);

                        } catch (err) {
                            alert('ไฟล์ JSON เสียหาย: ' + err.message);
                        }
                    };
                    reader.readAsText(file);
                    document.body.removeChild(fileInput);
                });

                fileInput.click();
            });
        }

    })();

    // ═══════════════════════════════════════════════════════════
    // MODULE 9: Live Preview & Style Controls (Native DOM Renderer)
    // ═══════════════════════════════════════════════════════════
    (function initLivePreview() {
        const state = {
            style: {
                font: 'Prompt', size: 64, color: '#FFDE59',
                strokeColor: '#000000', stroke: 3,
                shadow: 'hard', bold: true, italic: false, underline: false,
                align: 'center', bgColor: '#000000', bgOpacity: 0,
                spacing: 0, opacity: 100, position: 85, animation: 'pop'
            },
            words: [],
            preset: 'flow',
            chunks: [],
            activeChunkIndex: -1
        };

        const overlay = document.getElementById('subtitle-overlay');

        // ── SCALED FONT SIZE ────────────────────────────────────
        // The preview container is smaller than the real output.
        // We scale font relative to the video element's true resolution.
        function getScaledSize(rawPx) {
            const video = document.getElementById('main-video');
            const targetW = (video && video.videoWidth) ? video.videoWidth : 1080;
            const refEl = video || overlay.parentElement;
            const actualW = refEl ? refEl.offsetWidth : 400;
            const scale = actualW / targetW;
            return Math.max(12, Math.round(rawPx * scale));
        }

        // ── BUILD CHUNKS ─────────────────────────────────────────
        function buildChunks(words, preset) {
            const MAX = preset === 'hormozi' ? 1 : (preset === 'flow' ? 4 : 10);
            const chunks = [];
            let cur = [];
            words.forEach((w, i) => {
                cur.push(w);
                const next = words[i + 1];
                if (cur.length >= MAX || (next && next.start - w.end > 0.5)) {
                    chunks.push(cur);
                    cur = [];
                }
            });
            if (cur.length > 0) chunks.push(cur);
            return chunks;
        }

        // ── APPLY FULL STYLE to overlay ──────────────────────────
        function applyStyleToOverlay() {
            const s = state.style;
            if (!overlay) return;

            const scaledPx = getScaledSize(s.size);

            overlay.style.fontFamily    = `"${s.font}", 'Prompt', sans-serif`;
            overlay.style.fontSize      = scaledPx + 'px';
            overlay.style.fontWeight    = s.bold ? '800' : '400';
            overlay.style.fontStyle     = s.italic ? 'italic' : 'normal';
            overlay.style.textDecoration= s.underline ? 'underline' : 'none';
            overlay.style.textAlign     = s.align;
            overlay.style.letterSpacing = s.spacing + 'px';
            overlay.style.opacity       = (s.opacity / 100).toString();
            overlay.style.webkitTextStroke = s.stroke > 0 ? `${s.stroke}px ${s.strokeColor}` : 'unset';
            overlay.style.paintOrder = 'stroke fill';

            // Position (% from top → we set bottom accordingly)
            // position=85 → bottom=15%, position=50 → bottom=50%
            overlay.style.bottom = (100 - s.position) + '%';
            overlay.style.top    = 'auto';

            // Background
            if (s.bgOpacity > 0) {
                const r = parseInt(s.bgColor.slice(1,3),16);
                const g = parseInt(s.bgColor.slice(3,5),16);
                const b = parseInt(s.bgColor.slice(5,7),16);
                overlay.style.background    = `rgba(${r},${g},${b},${s.bgOpacity})`;
                overlay.style.borderRadius  = '8px';
                overlay.style.padding       = '6px 18px';
            } else {
                overlay.style.background   = 'transparent';
                overlay.style.borderRadius = '0';
                overlay.style.padding      = '0 16px';
            }

            // Shadow
            let shadow = 'none';
            if (s.shadow === 'soft')    shadow = `2px 2px 8px rgba(0,0,0,0.85)`;
            if (s.shadow === 'hard')    shadow = `4px 4px 0px ${s.strokeColor}`;
            if (s.shadow === 'glow')    shadow = `0 0 12px ${s.color}, 0 0 28px ${s.color}`;
            if (s.shadow === 'outline') shadow = `-2px -2px 0 ${s.strokeColor}, 2px -2px 0 ${s.strokeColor}, -2px 2px 0 ${s.strokeColor}, 2px 2px 0 ${s.strokeColor}`;
            overlay.style.textShadow = shadow;

            // Preset-specific overrides (weight/case)
            if (state.preset === 'hormozi') {
                overlay.style.textTransform = 'uppercase';
            } else {
                overlay.style.textTransform = 'none';
            }
        }

        // ── RENDER CHUNK at time t ───────────────────────────────
        function renderAtTime(t) {
            if (!overlay || state.chunks.length === 0) return;

            let chunkIdx = -1;
            for (let i = 0; i < state.chunks.length; i++) {
                const start = state.chunks[i][0].start;
                const end   = state.chunks[i][state.chunks[i].length - 1].end;
                if (t >= start - 0.1 && t <= end + 0.25) { chunkIdx = i; break; }
            }

            if (chunkIdx === -1) { overlay.innerHTML = ''; return; }

            if (chunkIdx !== state.activeChunkIndex) {
                state.activeChunkIndex = chunkIdx;
                const chunk = state.chunks[chunkIdx];
                overlay.innerHTML = chunk.map((w, i) =>
                    `<span class="lp-word" data-start="${w.start}" data-end="${w.end}">${w.word}</span>`
                ).join('');
                overlay.style.animation = 'none'; // Clear any old CSS animation
            }

            // Sync animation directly to exact video time
            const chunk = state.chunks[chunkIdx];
            const start = chunk[0].start;
            const elapsed = t - start;
            
            let scale = 1;
            let animOpacity = 1;

            let rotation = 0;

            if (state.style.animation === 'pop') {
                if (elapsed >= 0 && elapsed <= 0.15) {
                    const progress = elapsed / 0.15;
                    // CapCut style pop: scale 0.7 -> 1.0, opacity 0 -> 1
                    scale = 0.7 + (0.3 * progress);
                    animOpacity = progress;
                } else if (elapsed < 0) {
                    scale = 0.7; animOpacity = 0;
                }
            } else if (state.style.animation === 'spring') {
                if (elapsed >= 0 && elapsed <= 0.1) {
                    const progress = elapsed / 0.1;
                    scale = 0.5 + (0.65 * progress); // 0.5 to 1.15
                    animOpacity = progress;
                } else if (elapsed > 0.1 && elapsed <= 0.2) {
                    const progress = (elapsed - 0.1) / 0.1;
                    scale = 1.15 - (0.15 * progress); // 1.15 down to 1.0
                } else if (elapsed < 0) {
                    scale = 0.5; animOpacity = 0;
                }
            } else if (state.style.animation === 'zoom-out') {
                if (elapsed >= 0 && elapsed <= 0.15) {
                    const progress = elapsed / 0.15;
                    scale = 1.5 - (0.5 * progress); // 1.5 down to 1.0
                    animOpacity = progress;
                } else if (elapsed < 0) {
                    scale = 1.5; animOpacity = 0;
                }
            } else if (state.style.animation === 'wobble') {
                if (elapsed >= 0 && elapsed <= 0.1) {
                    const progress = Math.min(1, elapsed / 0.1);
                    rotation = -15 + (25 * progress); // -15 to +10
                    animOpacity = progress;
                } else if (elapsed > 0.1 && elapsed <= 0.2) {
                    const progress = Math.min(1, (elapsed - 0.1) / 0.1);
                    rotation = 10 - (10 * progress); // +10 to 0
                } else if (elapsed < 0) {
                    rotation = -15; animOpacity = 0;
                }
            } else if (state.style.animation === 'fade') {
                if (elapsed >= 0 && elapsed <= 0.15) {
                    animOpacity = elapsed / 0.15;
                } else if (elapsed < 0) {
                    animOpacity = 0;
                }
            }

            overlay.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
            const baseOpacity = state.style.opacity / 100;
            overlay.style.opacity = (baseOpacity * animOpacity).toString();

            // Word colors
            overlay.querySelectorAll('.lp-word').forEach(span => {
                span.style.color = state.style.color;
            });
        }

        // ── ANIMATION LOOP ───────────────────────────────────────
        function syncLoop() {
            const video = document.getElementById('main-video');
            if (video && state.chunks.length > 0) renderAtTime(video.currentTime);
            requestAnimationFrame(syncLoop);
        }
        requestAnimationFrame(syncLoop);

        // ── EVENTS ───────────────────────────────────────────────
        EventBus.on('transcribe-result', (words) => {
            state.words = words;
            state.chunks = buildChunks(words, state.preset);
            state.activeChunkIndex = -1;
            overlay.style.display = 'block';
            applyStyleToOverlay();
        });

        EventBus.on('preset-changed', (presetName) => {
            state.preset = presetName;
            state.chunks = buildChunks(state.words, presetName);
            state.activeChunkIndex = -1;

            const defaults = {
                hormozi: { size: 85, color: '#FFDE59', stroke: 3, shadow: 'hard', bold: true },
                flow:    { size: 64, color: '#00E5FF', stroke: 2, shadow: 'soft', bold: true },
                classic: { size: 48, color: '#FFD700', stroke: 0, shadow: 'none', bold: false }
            }[presetName];

            if (defaults) {
                Object.assign(state.style, defaults);
                if (sizeSlider)   { sizeSlider.value  = defaults.size;   sizeLabel.textContent  = defaults.size; }
                if (colorInput)   colorInput.value     = defaults.color;
                if (colorLabel)   colorLabel.textContent = defaults.color;
                if (strokeSelect) strokeSelect.value   = defaults.stroke;
                if (shadowSelect) shadowSelect.value   = defaults.shadow;
                syncFormatBtns();
            }
            applyStyleToOverlay();
        });

        // ── WIRE ALL CONTROLS ────────────────────────────────────
        const fontSel     = document.getElementById('style-font');
        const sizeSlider  = document.getElementById('style-size');
        const sizeLabel   = document.getElementById('style-size-label');
        const colorInput  = document.getElementById('style-color');
        const colorLabel  = document.getElementById('style-color-label');
        const bgInput     = document.getElementById('style-bg');
        const bgOpacity   = document.getElementById('style-bg-opacity');
        const strokeColorInput = document.getElementById('style-stroke-color');
        const strokeSelect= document.getElementById('style-stroke');
        const shadowSelect= document.getElementById('style-shadow');
        const spacingSlider= document.getElementById('style-spacing');
        const spacingLabel = document.getElementById('style-spacing-label');
        const opacitySlider= document.getElementById('style-opacity');
        const opacityLabel = document.getElementById('style-opacity-label');
        const posSlider   = document.getElementById('style-position');
        const posLabel    = document.getElementById('style-position-label');
        const boldBtn     = document.getElementById('style-bold');
        const italicBtn   = document.getElementById('style-italic');
        const underlineBtn= document.getElementById('style-underline');
        const alignBtns   = document.querySelectorAll('.align-btns .fmt-btn');
        const animationSel= document.getElementById('style-animation');

        // Size slider
        if (sizeSlider) sizeSlider.addEventListener('input', e => {
            state.style.size = parseInt(e.target.value);
            if (sizeLabel) sizeLabel.textContent = e.target.value;
            applyStyleToOverlay();
        });

        // Color
        if (colorInput) colorInput.addEventListener('input', e => {
            state.style.color = e.target.value;
            if (colorLabel) colorLabel.textContent = e.target.value;
            applyStyleToOverlay();
        });

        // BG color + opacity
        if (bgInput) bgInput.addEventListener('input', e => {
            state.style.bgColor = e.target.value;
            applyStyleToOverlay();
        });
        if (bgOpacity) bgOpacity.addEventListener('change', e => {
            state.style.bgOpacity = parseFloat(e.target.value);
            applyStyleToOverlay();
        });

        // Stroke
        if (strokeColorInput) strokeColorInput.addEventListener('input', e => {
            state.style.strokeColor = e.target.value;
            applyStyleToOverlay();
        });
        if (strokeSelect) strokeSelect.addEventListener('change', e => {
            state.style.stroke = parseInt(e.target.value);
            applyStyleToOverlay();
        });

        // Shadow
        if (shadowSelect) shadowSelect.addEventListener('change', e => {
            state.style.shadow = e.target.value;
            applyStyleToOverlay();
        });

        // Font
        if (fontSel) fontSel.addEventListener('change', e => {
            state.style.font = e.target.value;
            applyStyleToOverlay();
        });

        // Spacing
        if (spacingSlider) spacingSlider.addEventListener('input', e => {
            state.style.spacing = parseInt(e.target.value);
            if (spacingLabel) spacingLabel.textContent = e.target.value;
            applyStyleToOverlay();
        });

        // Animation
        if (animationSel) animationSel.addEventListener('change', e => {
            state.style.animation = e.target.value;
            applyStyleToOverlay();
        });

        // Opacity
        if (opacitySlider) opacitySlider.addEventListener('input', e => {
            state.style.opacity = parseInt(e.target.value);
            if (opacityLabel) opacityLabel.textContent = e.target.value + '%';
            applyStyleToOverlay();
        });

        // Position
        if (posSlider) posSlider.addEventListener('input', e => {
            state.style.position = parseInt(e.target.value);
            const val = parseInt(e.target.value);
            if (posLabel) posLabel.textContent = val <= 20 ? 'Top' : val >= 75 ? 'Bottom' : 'Mid';
            applyStyleToOverlay();
        });

        // Bold / Italic / Underline (toggle buttons)
        function syncFormatBtns() {
            if (boldBtn)      boldBtn.classList.toggle('active',      state.style.bold);
            if (italicBtn)    italicBtn.classList.toggle('active',    state.style.italic);
            if (underlineBtn) underlineBtn.classList.toggle('active', state.style.underline);
        }
        if (boldBtn) boldBtn.addEventListener('click', () => {
            state.style.bold = !state.style.bold;
            syncFormatBtns();
            applyStyleToOverlay();
        });
        if (italicBtn) italicBtn.addEventListener('click', () => {
            state.style.italic = !state.style.italic;
            syncFormatBtns();
            applyStyleToOverlay();
        });
        if (underlineBtn) underlineBtn.addEventListener('click', () => {
            state.style.underline = !state.style.underline;
            syncFormatBtns();
            applyStyleToOverlay();
        });
        // Init bold ON
        syncFormatBtns();

        // Alignment
        alignBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const map = { 'style-align-left': 'left', 'style-align-center': 'center', 'style-align-right': 'right' };
                state.style.align = map[btn.id] || 'center';
                alignBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyStyleToOverlay();
            });
        });

        // Expose for Render module
        EventBus.on('get-style-config', (cb) => { cb(state.style); });
    })();
    // ═══════════════════════════════════════════════════════════
    // MODULE 11: Cut Lab
    // ═══════════════════════════════════════════════════════════
    (function initCutLab() {
        const cutVideo = document.getElementById('cut-video');
        const waveCanvas = document.getElementById('waveform-canvas');
        const silCanvas = document.getElementById('silence-canvas');
        const playhead = document.getElementById('playhead');
        const scanBtn = document.getElementById('scan-silence-btn');
        const applyBtn = document.getElementById('apply-cut-btn');
        const statsEl = document.getElementById('cut-stats');
        
        let currentPeaks = [];
        let currentSilences = [];
        let videoDuration = 0;
        let currentVideoPath = null; // Track which file peaks belong to

        // Settings inputs
        const threshInput = document.getElementById('cut-threshold');
        const threshVal = document.getElementById('cut-threshold-val');
        const minDurInput = document.getElementById('cut-min-dur');
        const minDurVal = document.getElementById('cut-min-dur-val');
        const prePadInput = document.getElementById('cut-pre-pad');
        const prePadVal = document.getElementById('cut-pre-pad-val');
        const postPadInput = document.getElementById('cut-post-pad');
        const postPadVal = document.getElementById('cut-post-pad-val');
        const zoomInput = document.getElementById('cut-wave-zoom');
        const zoomVal = document.getElementById('cut-wave-zoom-val');

        // Sync slider values
        [
            [threshInput, threshVal], [minDurInput, minDurVal], 
            [prePadInput, prePadVal], [postPadInput, postPadVal]
        ].forEach(([input, label]) => {
            if (input) input.addEventListener('input', () => {
                label.textContent = input.value;
                if (input === prePadInput || input === postPadInput) {
                    drawSilences();
                }
                if (input === threshInput) {
                    drawWaveform(); // Redraw threshold lines dynamically
                }
            });
        });
        
        if (zoomInput) zoomInput.addEventListener('input', () => {
            if (zoomVal) zoomVal.textContent = zoomInput.value + 'x';
            drawWaveform();
        });

        let peaksReady = false;
        let metadataReady = false;

        function tryDrawAll() {
            if (peaksReady && metadataReady && videoDuration > 0) {
                drawWaveform();
                drawSilences();
                autoSuggestThreshold();
                statsEl.textContent = `Audio extracted (${formatTime(videoDuration)}). Ready to scan.`;
            }
        }

        // Auto-suggest threshold from audio peaks
        function autoSuggestThreshold() {
            if (!currentPeaks || currentPeaks.length === 0) return;
            // Calculate RMS of all peaks
            let sumSq = 0;
            for (let i = 0; i < currentPeaks.length; i++) {
                sumSq += currentPeaks[i] * currentPeaks[i];
            }
            const rms = Math.sqrt(sumSq / currentPeaks.length);
            // Convert to dB (reference = 1.0)
            const rmsDb = 20 * Math.log10(Math.max(rms, 0.00001));
            // Silence threshold = RMS - 6dB (a good heuristic)
            const suggestedThreshold = Math.round(Math.max(-60, Math.min(-10, rmsDb - 6)));
            if (threshInput) {
                threshInput.value = suggestedThreshold;
                if (threshVal) threshVal.textContent = suggestedThreshold;
            }
        }

        // Load video into Cut Lab when global video changes
        EventBus.on('video-loaded', async (path) => {
            if (!cutVideo) return;
            const cutDropZone = document.getElementById('cut-drop-zone');
            if (cutDropZone) cutDropZone.style.display = 'none';
            cutVideo.style.display = 'block';

            // Reset ALL state for new file
            peaksReady = false;
            metadataReady = false;
            currentSilences = [];
            currentPeaks = [];
            videoDuration = 0;
            currentVideoPath = path;

            cutVideo.src = 'file:///' + path.replace(/\\/g, '/');
            cutVideo.load(); // Force reload to trigger loadedmetadata fresh
            statsEl.textContent = 'Loading video & extracting audio...';

            // Fetch peaks for THIS specific path
            if (window.electronAPI) {
                const res = await window.electronAPI.getAudioPeaks(path);
                // Only apply if user hasn't switched to another file while we were loading
                if (res.success && path === currentVideoPath) {
                    currentPeaks = res.peaks;
                    peaksReady = true;
                    tryDrawAll();
                    
                    // Reset speed on new video
                    if (speedSelect) cutVideo.playbackRate = parseFloat(speedSelect.value);
                }
            }
        });

        if (cutVideo) cutVideo.addEventListener('loadedmetadata', () => {
            // Only trust this duration if it's for the current file
            videoDuration = cutVideo.duration;
            metadataReady = true;
            tryDrawAll();
        });

        const waveContainer = document.getElementById('wave-container');
        const scrollInner = document.getElementById('waveform-scroll-inner');
        const ZOOM_PX_PER_SEC = 50; // 50 pixels per second for zoom effect

        function getDynamicWidth() {
            if (!videoDuration || !waveContainer) return waveContainer ? waveContainer.clientWidth : 800;
            return Math.max(waveContainer.clientWidth, videoDuration * ZOOM_PX_PER_SEC);
        }

        let isDrawingScroll = false;
        if (waveContainer) {
            waveContainer.addEventListener('scroll', () => {
                if (!isDrawingScroll && videoDuration > 0) {
                    isDrawingScroll = true;
                    requestAnimationFrame(() => {
                        drawWaveform();
                        drawSilences();
                        isDrawingScroll = false;
                    });
                }
            });
        }

        if (cutVideo) cutVideo.addEventListener('timeupdate', () => {
            // Use cutVideo.duration directly — never use the videoDuration variable which may be stale
            const dur = cutVideo.duration;
            if (dur > 0 && !isNaN(dur) && playhead && waveContainer) {
                const pct = (cutVideo.currentTime / dur) * 100;
                playhead.style.left = `${pct}%`;

                // Auto-scroll logic
                const playheadX = (cutVideo.currentTime / dur) * getDynamicWidth();
                const scrollLeft = waveContainer.scrollLeft;
                const viewWidth = waveContainer.clientWidth;
                
                if (playheadX > scrollLeft + viewWidth * 0.85) {
                    waveContainer.scrollLeft = playheadX - viewWidth * 0.15;
                } else if (playheadX < scrollLeft) {
                    waveContainer.scrollLeft = playheadX - viewWidth * 0.15;
                }
            }
        });

        function drawWaveform() {
            if (!waveCanvas || !waveContainer) return;
            const ctx = waveCanvas.getContext('2d');
            
            const dWidth = getDynamicWidth();
            if (scrollInner) scrollInner.style.width = dWidth + 'px';
            
            const viewWidth = waveContainer.clientWidth;
            const scrollLeft = waveContainer.scrollLeft;
            
            waveCanvas.width = viewWidth;
            waveCanvas.height = waveContainer.clientHeight;
            waveCanvas.style.width = viewWidth + 'px';
            waveCanvas.style.transform = `translateX(${scrollLeft}px)`;
            
            ctx.clearRect(0, 0, viewWidth, waveCanvas.height);
            if (!currentPeaks || !currentPeaks.length) return;
            
            // Normalize audio peaks
            let globalMax = 0.0001; 
            for (let i = 0; i < currentPeaks.length; i++) {
                const abs = Math.abs(currentPeaks[i]);
                if (abs > globalMax) globalMax = abs;
            }
            
            ctx.strokeStyle = '#295c29'; 
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Lock waveform sampling perfectly to videoDuration to fix A/V drift
            const AUDIO_SAMPLE_RATE = 100; // Peaks are 100Hz min/max pairs
            const samplesPerPixel = (videoDuration * AUDIO_SAMPLE_RATE) / dWidth;
            const amp = waveCanvas.height / 2;

            for (let i = 0; i < viewWidth; i++) {
                const absoluteX = scrollLeft + i;
                if (absoluteX >= dWidth) break; // Don't draw past end
                
                let maxP = -Infinity;
                let minP = Infinity;
                
                const startIdx = Math.floor(absoluteX * samplesPerPixel);
                const endIdx = Math.max(startIdx + 1, Math.floor((absoluteX + 1) * samplesPerPixel));
                
                for (let j = startIdx; j < endIdx && (j*2+1) < currentPeaks.length; j++) {
                    const min = currentPeaks[j*2];
                    const max = currentPeaks[j*2+1];
                    if (max > maxP) maxP = max;
                    if (min < minP) minP = min;
                }
                
                if (maxP === -Infinity) continue;

                const zoom = parseFloat(zoomInput ? zoomInput.value : 1);

                const y1 = amp - Math.min(1, (maxP / globalMax) * zoom) * amp * 0.95;
                const y2 = amp - Math.max(-1, (minP / globalMax) * zoom) * amp * 0.95;
                
                ctx.moveTo(i, y1);
                ctx.lineTo(i, Math.max(y1 + 1, y2));
            }
            ctx.stroke();

            // Draw Threshold Lines
            const threshDb = parseFloat(threshInput ? threshInput.value : -32);
            // FFmpeg silencedetect compares absolute amplitude to threshold.
            // 0 dBFS = 1.0 amplitude.
            const threshAmp = Math.pow(10, threshDb / 20);
            const zoom = parseFloat(zoomInput ? zoomInput.value : 1);
            const yOffset = Math.min(1, (threshAmp / globalMax) * zoom) * amp * 0.95;

            ctx.strokeStyle = 'rgba(255, 222, 89, 0.4)'; // Transparent yellow
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]); // Dashed line
            ctx.beginPath();
            // Top threshold
            ctx.moveTo(0, amp - yOffset);
            ctx.lineTo(viewWidth, amp - yOffset);
            // Bottom threshold
            ctx.moveTo(0, amp + yOffset);
            ctx.lineTo(viewWidth, amp + yOffset);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash
        }

        function drawSilences() {
            if (!silCanvas || !waveContainer) return;
            const ctx = silCanvas.getContext('2d');
            const dWidth = getDynamicWidth();
            
            const viewWidth = waveContainer.clientWidth;
            const scrollLeft = waveContainer.scrollLeft;
            
            silCanvas.width = viewWidth;
            silCanvas.height = waveContainer.clientHeight;
            silCanvas.style.width = viewWidth + 'px';
            silCanvas.style.transform = `translateX(${scrollLeft}px)`;
            
            ctx.clearRect(0, 0, viewWidth, silCanvas.height);

            // Timebolt Solid Light Green for Kept Sections
            ctx.fillStyle = '#82c982'; 
            // Only draw green background up to the actual end of video
            const bgWidth = Math.min(viewWidth, dWidth - scrollLeft);
            if (bgWidth > 0) {
                ctx.fillRect(0, 0, bgWidth, silCanvas.height);
            }

            if (!videoDuration || !currentSilences || currentSilences.length === 0) {
                if (videoDuration) statsEl.textContent = 'No silences scanned yet.';
                return;
            }

            // Timebolt Solid Light Red for Cut Sections
            ctx.fillStyle = '#e07474'; 
            let removedSecs = 0;
            
            const prePad = parseFloat(prePadInput ? prePadInput.value : 0) || 0;
            const postPad = parseFloat(postPadInput ? postPadInput.value : 0) || 0;

            currentSilences.forEach(s => {
                // Padding = EXPAND outward from cut points:
                //   postPad: expand AFTER speech ends  → s.start + postPad (cut starts here)
                //   prePad:  expand BEFORE speech starts → s.end - prePad (cut ends here)
                let actualStart = s.start + postPad;
                let actualEnd = s.end - prePad;
                
                if (actualStart >= actualEnd) {
                    return; // Padding consumed the silence, nothing to cut
                }

                const startX = (actualStart / videoDuration) * dWidth;
                const endX = (actualEnd / videoDuration) * dWidth;
                removedSecs += (actualEnd - actualStart);
                
                // Only draw if visible in viewport
                if (endX >= scrollLeft && startX <= scrollLeft + viewWidth) {
                    const localStartX = Math.max(0, startX - scrollLeft);
                    const localEndX = Math.min(viewWidth, endX - scrollLeft);
                    ctx.fillRect(localStartX, 0, localEndX - localStartX, silCanvas.height);
                }
            });

            const afterCut = videoDuration - removedSecs;
            const pct = Math.round((removedSecs / videoDuration) * 100);
            statsEl.textContent = `Total: ${formatTime(videoDuration)} → After Cut: ${formatTime(afterCut)} | Removed: ${removedSecs.toFixed(1)}s (${pct}%) | ${currentSilences.length} sections cut`;
        }

        // Allow clicking on canvas to seek
        if (scrollInner) scrollInner.addEventListener('click', (e) => {
            if (videoDuration > 0 && cutVideo) {
                const rect = scrollInner.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pct = x / rect.width;
                cutVideo.currentTime = pct * videoDuration;
            }
        });

        // Playback Speed
        const speedSelect = document.getElementById('cut-playback-speed');
        if (speedSelect) speedSelect.addEventListener('change', () => {
            if (cutVideo) cutVideo.playbackRate = parseFloat(speedSelect.value);
        });

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            const activeTabBtn = document.querySelector('.tab-btn.active');
            if (!activeTabBtn || activeTabBtn.dataset.target !== 'cut-lab') return;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (!cutVideo || !videoDuration) return;

            function jumpToNextCut(direction) {
                let edges = [0, videoDuration];
                currentSilences.forEach(s => {
                    edges.push(s.start);
                    edges.push(s.end);
                });
                edges = [...new Set(edges)].sort((a,b) => a-b);
                
                const current = cutVideo.currentTime;
                if (direction === 1) { // Next
                    const next = edges.find(e => e > current + 0.05);
                    if (next !== undefined) cutVideo.currentTime = next;
                } else { // Previous
                    const prev = [...edges].reverse().find(e => e < current - 0.05);
                    if (prev !== undefined) cutVideo.currentTime = prev;
                }
            }

            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    if (cutVideo.paused) cutVideo.play();
                    else cutVideo.pause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    cutVideo.currentTime = Math.max(0, cutVideo.currentTime - (1/30));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    cutVideo.currentTime = Math.min(videoDuration, cutVideo.currentTime + (1/30));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    jumpToNextCut(1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    jumpToNextCut(-1);
                    break;
                case 'KeyS':
                    // Split timeline (Future feature)
                    console.log('Split shortcut (S) pressed. To be implemented.');
                    break;
            }
        });

        // Setup Scan Progress listener
        if (window.electronAPI && window.electronAPI.onScanSilenceProgress) {
            window.electronAPI.onScanSilenceProgress((pct) => {
                if (scanBtn && scanBtn.disabled) {
                    scanBtn.textContent = `🔍 Scanning... ${pct}%`;
                }
            });
        }

        if (scanBtn) scanBtn.addEventListener('click', async () => {
            let videoPath = null;
            EventBus.emit('get-video-path', p => videoPath = p);
            if (!videoPath) { alert('Load a video first!'); return; }

            scanBtn.disabled = true;
            scanBtn.textContent = '🔍 Scanning...';
            
            try {
                const res = await window.electronAPI.scanSilence({
                    videoPath,
                    threshold: parseFloat(threshInput.value),
                    minDuration: parseFloat(minDurInput.value),
                    duration: videoDuration
                });
                
                if (res.success) {
                    currentSilences = res.silences;
                    // Redraw both to ensure correct alignment
                    drawWaveform();
                    drawSilences();
                } else {
                    alert('Scan failed.');
                }
            } finally {
                scanBtn.disabled = false;
                scanBtn.textContent = '🔍 Scan Silence';
            }
        });

        if (applyBtn) applyBtn.addEventListener('click', async () => {
            let videoPath = null;
            EventBus.emit('get-video-path', p => videoPath = p);
            if (!videoPath) { alert('Load a video first!'); return; }

            applyBtn.disabled = true;
            applyBtn.textContent = '✂️ Cutting...';

            try {
                const res = await window.electronAPI.cutSilence({
                    videoPath,
                    threshold: parseFloat(threshInput.value),
                    minDuration: parseFloat(minDurInput.value),
                    prePad: parseFloat(prePadInput.value),
                    postPad: parseFloat(postPadInput.value),
                    audioNorm: document.getElementById('cut-audio-norm')?.checked || false
                });

                if (res.success) {
                    EventBus.emit('video-path-updated', res.outputPath);
                    EventBus.emit('switch-tab', 'editor');
                    EventBus.emit('show-transcript-status', {
                        msg: `Silence cut successfully in ${res.elapsed}s!<br><span style="font-size:0.8rem;color:var(--text-secondary);">กด Transcribe ต่อได้เลย</span>`,
                        color: '#4ade80'
                    });
                } else {
                    alert('Cut error: ' + res.error);
                }
            } catch(e) {
                alert('Cut error: ' + e.message);
            } finally {
                applyBtn.disabled = false;
                applyBtn.textContent = '✂️ Apply & Send to Editor →';
            }
        });
        
        // Listen to window resize to redraw canvas
        window.addEventListener('resize', () => {
            drawWaveform();
            drawSilences();
        });

    })();

});
