let video;
let container;
let chunks = [];
let words = [];
let preset = 'flow';
let activeChunkIndex = -1;
let isLivePreview = false;
let isDomReady = false;
let pendingInitData = null;
let styleConfig = null;

document.addEventListener("DOMContentLoaded", () => {
    isDomReady = true;
    video = document.getElementById('video-bg');
    container = document.getElementById('subtitle-container');

    if (window.RENDER_DATA) {
        init(window.RENDER_DATA);
    } else if (pendingInitData) {
        if (video) video.style.display = 'none';
        init(pendingInitData);
    }
});

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'HYPERCUT_INIT') {
        isLivePreview = true;
        if (!isDomReady) {
            pendingInitData = event.data.payload;
            return;
        }
        if (video) video.style.display = 'none';
        init(event.data.payload);
    } else if (event.data && event.data.type === 'HYPERCUT_SYNC_TIME') {
        if (isDomReady) syncSubtitles(event.data.payload.currentTime);
    }
});

function init(data) {
    if (data.videoPath && !isLivePreview) {
        video.src = 'file:///' + data.videoPath.replace(/\\/g, '/');
    }
    
    preset = data.preset || 'flow';
    words = data.words || [];
    styleConfig = data.style || {
        font: 'Prompt', size: 64, color: '#FFDE59',
        strokeColor: '#000000', stroke: 3,
        shadow: 'hard', bold: true, italic: false, underline: false,
        align: 'center', bgColor: '#000000', bgOpacity: 0,
        spacing: 0, opacity: 100, position: 85
    };
    
    applyStyleToContainer();

    chunks = [];
    let currentChunk = [];
    const MAX = preset === 'hormozi' ? 1 : (preset === 'flow' ? 4 : 10);

    words.forEach((w, i) => {
        currentChunk.push(w);
        const nextWord = words[i+1];
        if (currentChunk.length >= MAX || (nextWord && nextWord.start - w.end > 0.5)) {
            chunks.push(currentChunk);
            currentChunk = [];
        }
    });
    if (currentChunk.length > 0) chunks.push(currentChunk);

    activeChunkIndex = -1;
    container.innerHTML = '';
}

function applyStyleToContainer() {
    const s = styleConfig;
    if (!container) return;

    // Use full size for renderer (1920x1080 context typically)
    const scaledPx = s.size;

    container.style.fontFamily    = `"${s.font}", 'Prompt', sans-serif`;
    container.style.fontSize      = scaledPx + 'px';
    container.style.fontWeight    = s.bold ? '800' : '400';
    container.style.fontStyle     = s.italic ? 'italic' : 'normal';
    container.style.textDecoration= s.underline ? 'underline' : 'none';
    container.style.textAlign     = s.align;
    container.style.letterSpacing = s.spacing + 'px';
    container.style.opacity       = (s.opacity / 100).toString();
    container.style.webkitTextStroke = s.stroke > 0 ? `${s.stroke}px ${s.strokeColor}` : 'unset';
    container.style.paintOrder = 'stroke fill';
    container.style.lineHeight = '1.1';
    container.style.wordBreak = 'keep-all';

    container.style.bottom = (100 - s.position) + '%';
    container.style.top    = 'auto';

    if (s.bgOpacity > 0) {
        const r = parseInt(s.bgColor.slice(1,3),16);
        const g = parseInt(s.bgColor.slice(3,5),16);
        const b = parseInt(s.bgColor.slice(5,7),16);
        container.style.background    = `rgba(${r},${g},${b},${s.bgOpacity})`;
        container.style.borderRadius  = '8px';
        container.style.padding       = '6px 18px';
    } else {
        container.style.background   = 'transparent';
        container.style.borderRadius = '0';
        container.style.padding      = '0 16px';
    }

    let shadow = 'none';
    if (s.shadow === 'soft')    shadow = `2px 2px 8px rgba(0,0,0,0.85)`;
    if (s.shadow === 'hard')    shadow = `4px 4px 0px ${s.strokeColor}`;
    if (s.shadow === 'glow')    shadow = `0 0 12px ${s.color}, 0 0 28px ${s.color}`;
    if (s.shadow === 'outline') shadow = `-2px -2px 0 ${s.strokeColor}, 2px -2px 0 ${s.strokeColor}, -2px 2px 0 ${s.strokeColor}, 2px 2px 0 ${s.strokeColor}`;
    container.style.textShadow = shadow;

    if (preset === 'hormozi') {
        container.style.textTransform = 'uppercase';
    } else {
        container.style.textTransform = 'none';
    }
}

function syncSubtitles(t) {
    if (!container || chunks.length === 0) return;

    let chunkIdx = -1;
    for (let i = 0; i < chunks.length; i++) {
        const start = chunks[i][0].start;
        const end   = chunks[i][chunks[i].length - 1].end;
        if (t >= start - 0.1 && t <= end + 0.25) { chunkIdx = i; break; }
    }

    if (chunkIdx === -1) { container.innerHTML = ''; return; }

    if (chunkIdx !== activeChunkIndex) {
        activeChunkIndex = chunkIdx;
        const chunk = chunks[chunkIdx];
        container.innerHTML = chunk.map((w) =>
            `<span class="subtitle-word" style="display: inline-block; margin: 0; white-space: nowrap;" data-start="${w.start}" data-end="${w.end}">${w.word}</span>`
        ).join('');
    }

    // Static text (No motion)
    container.querySelectorAll('.subtitle-word').forEach(span => {
        span.style.color = styleConfig.color;
        span.style.transform = 'scale(1)';
    });
}

// Expose for Puppeteer Renderer
window.renderFrame = function(time) {
    if (video) video.style.display = 'none';
    syncSubtitles(time);
};
