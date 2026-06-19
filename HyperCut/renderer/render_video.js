const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static').path;

function formatAssTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function hexToAssColor(hex, opacityPercent = 100) {
    if (!hex) hex = '#FFFFFF';
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const r = hex.substring(0, 2);
    const g = hex.substring(2, 4);
    const b = hex.substring(4, 6);
    
    // Alpha inversion (100% opacity = 00, 0% opacity = FF)
    let alpha = Math.round((1 - (opacityPercent / 100)) * 255).toString(16).toUpperCase().padStart(2, '0');
    return `&H${alpha}${b}${g}${r}`;
}

async function main() {
    const configPath = process.argv[2];
    if (!configPath || !fs.existsSync(configPath)) {
        console.error("Config file not provided or not found");
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("Starting FAST ASS render for: " + config.videoPath);

    // 1. Get Video info via ffprobe
    const ffprobeArgs = [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=p=0',
        config.videoPath
    ];

    const probeResult = spawnSync(ffprobeStatic, ffprobeArgs, { encoding: 'utf-8' });
    if (probeResult.error) {
        console.error("FFprobe error:", probeResult.error);
        process.exit(1);
    }

    const probeData = probeResult.stdout.trim().split(',');
    let width = parseInt(probeData[0]) || 1080;
    let height = parseInt(probeData[1]) || 1920;

    // 2. Generate ASS Subtitles File
    const s = config.style || {
        font: 'Prompt', size: 64, color: '#FFDE59',
        strokeColor: '#000000', stroke: 3,
        shadow: 'none', bold: true, italic: false, underline: false,
        align: 'center', bgColor: '#000000', bgOpacity: 0,
        spacing: 0, opacity: 100, position: 85, animation: 'pop'
    };

    // Mapping Alignment (ASS Numpad)
    let alignment = 2; // Bottom Center
    if (s.align === 'left') alignment = 1;
    if (s.align === 'right') alignment = 3;

    // BorderStyle: 1 = Outline+Shadow, 3 = Opaque Box
    let borderStyle = s.bgOpacity > 0 ? 3 : 1;
    let outline = s.stroke || 0;
    
    let shadow = 0;
    if (s.shadow === 'soft') shadow = 2;
    if (s.shadow === 'hard') shadow = 4;
    if (s.shadow === 'glow') shadow = 0; // ASS Glow requires \blur tags, keeping simple
    if (s.shadow === 'outline') shadow = 0; // Handled by stroke

    const primaryColor = hexToAssColor(s.color, s.opacity);
    const outlineColor = hexToAssColor(s.strokeColor, s.opacity);
    
    // Background color mapping for BorderStyle=3
    let backColor = outlineColor;
    if (borderStyle === 3) {
        backColor = hexToAssColor(s.bgColor, s.bgOpacity);
    } else if (shadow > 0) {
        // Drop shadow color usually black with some transparency
        backColor = hexToAssColor('#000000', 80);
        if (s.shadow === 'hard') backColor = outlineColor; // Hard block uses stroke color
    }

    // MarginV (Bottom distance)
    const marginV = Math.floor(((100 - s.position) / 100) * height);

    let assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${s.font},${s.size},${primaryColor},&H000000FF,${outlineColor},${backColor},${s.bold ? -1 : 0},${s.italic ? -1 : 0},${s.underline ? -1 : 0},0,100,100,${s.spacing},0,${borderStyle},${outline},${shadow},${alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Re-chunk words
    const preset = config.preset || 'flow';
    const chunks = [];
    let currentChunk = [];
    const MAX = preset === 'hormozi' ? 1 : (preset === 'flow' ? 4 : 10);

    const words = config.words || [];
    words.forEach((w, i) => {
        currentChunk.push(w);
        const nextWord = words[i+1];
        if (currentChunk.length >= MAX || (nextWord && nextWord.start - w.end > 0.5)) {
            chunks.push(currentChunk);
            currentChunk = [];
        }
    });
    if (currentChunk.length > 0) chunks.push(currentChunk);

    // Write Dialogues
    chunks.forEach(chunk => {
        const start = formatAssTime(chunk[0].start);
        const end = formatAssTime(chunk[chunk.length - 1].end);
        
        let text = chunk.map(w => w.word).join(''); // Already joined without spaces
        
        // Add Animation tags
        let animTag = '';
        if (s.animation === 'pop') {
            animTag = '{\\fad(50,0)\\fscx70\\fscy70\\t(0,150,\\fscx100\\fscy100)}';
        } else if (s.animation === 'spring') {
            animTag = '{\\fad(50,0)\\fscx50\\fscy50\\t(0,100,\\fscx115\\fscy115)\\t(100,200,\\fscx100\\fscy100)}';
        } else if (s.animation === 'zoom-out') {
            animTag = '{\\fad(150,0)\\fscx150\\fscy150\\t(0,150,\\fscx100\\fscy100)}';
        } else if (s.animation === 'wobble') {
            animTag = '{\\fad(100,0)\\frz-15\\t(0,100,\\frz10)\\t(100,200,\\frz0)}';
        } else if (s.animation === 'fade') {
            animTag = '{\\fad(150,0)}';
        }
        
        // Wrap text with style
        if (preset === 'hormozi') {
            text = text.toUpperCase();
        }
        
        assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${animTag}${text}\n`;
    });

    const assPath = path.join(__dirname, 'temp_subtitles.ass');
    fs.writeFileSync(assPath, "\uFEFF" + assContent, 'utf8'); // UTF-8 BOM
    console.log("ASS subtitles generated at " + assPath);

    // 3. Setup FFmpeg
    console.log("Starting Fast FFmpeg Render...");
    
    // Convert absolute path to FFmpeg escaped path for filters
    // e.g. C:\path\to\file.ass -> C\:/path/to/file.ass
    let escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

    const ffmpegArgs = [
        '-y',
        '-i', config.videoPath,
        '-vf', `ass='${escapedAssPath}'`,
        '-c:a', 'copy',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        config.outputPath
    ];

    const ffmpegProcess = spawn(ffmpegStatic, ffmpegArgs);

    ffmpegProcess.stderr.on('data', (data) => {
        const str = data.toString();
        // Look for progress time: "time=00:00:05.12"
        const timeMatch = str.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch) {
            console.log(`Render Progress: ${timeMatch[1]}`);
        }
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg exited with code ${code}`);
        try { fs.unlinkSync(assPath); } catch(e) {}
        if (code === 0) {
            console.log("Done!");
        } else {
            console.error("Render failed.");
            process.exit(1);
        }
    });
}

main().catch(err => {
    console.error("Render crashed:", err);
    process.exit(1);
});
