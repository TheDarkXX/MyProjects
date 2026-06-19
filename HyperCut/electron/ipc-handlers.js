const { spawn } = require('child_process');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const { dialog } = require('electron');

function setupIpcHandlers(ipcMain) {
  ipcMain.removeHandler('transcribe-video');
  ipcMain.handle('transcribe-video', async (event, videoPath) => {
    console.log(`[IPC] Requested transcription for: ${videoPath}`);
    
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../python/transcribe.py');
      const pythonProcess = spawn('python', [pythonScript, videoPath]);

      let finalResult = null;
      let errorLog = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        // Python might print multiple lines of JSON
        const lines = output.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'progress') {
              // Send progress back to renderer
              event.sender.send('transcribe-progress', parsed);
            } else if (parsed.type === 'result') {
              finalResult = parsed.data;
            } else if (parsed.type === 'error') {
              errorLog += parsed.message + '\n';
            }
          } catch (e) {
            // Not a JSON line, maybe a random print from whisper or torch
            console.log(`[Python output]: ${line}`);
          }
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const errStr = data.toString();
        console.error(`[Python stderr]: ${errStr}`);
        // We don't always reject here because whisper prints warnings to stderr
      });

      pythonProcess.on('close', (code) => {
        console.log(`[IPC] Python process exited with code ${code}`);
        if (code === 0 && finalResult) {
          resolve({ success: true, data: finalResult });
        } else {
          resolve({ success: false, error: errorLog || `Process exited with code ${code}` });
        }
      });
    });
  });

  ipcMain.removeHandler('render-video');
  ipcMain.handle('render-video', async (event, renderData) => {
    console.log(`[IPC] Requested rendering for preset: ${renderData.preset}`);
    const fs = require('fs');
    
    return new Promise((resolve, reject) => {
      try {
        // 1. Setup output path and config file
        const parsedVideo = path.parse(renderData.videoPath);
        const outputPath = path.join(parsedVideo.dir, `${parsedVideo.name}_rendered_${renderData.preset}.mp4`);
        const configPath = path.join(__dirname, '../renderer/temp_render_config.json');
        
        // Ensure RENDER_DATA format matches what script expects
        const renderConfig = {
            videoPath: renderData.videoPath,
            outputPath: outputPath,
            preset: renderData.preset,
            words: renderData.words,
            style: renderData.style || null
        };
        fs.writeFileSync(configPath, JSON.stringify(renderConfig), 'utf-8');

        // 2. Setup output path (done above)

        // 3. Run Node script
        event.sender.send('render-progress', { status: 'Starting Subtitle Engine...' });
        
        const startTime = Date.now();
        const rendererDir = path.join(__dirname, '../renderer');
        const renderProcess = spawn('node', ['render_video.js', configPath], { cwd: rendererDir });

        let errorLog = '';

        renderProcess.stdout.on('data', (data) => {
          const out = data.toString().trim();
          if (out) {
            console.log(`[Renderer]: ${out}`);
            if (out.includes('Progress:') || out.includes('Info:')) {
                event.sender.send('render-progress', { status: out.split('\n')[0] });
            }
          }
        });

        renderProcess.stderr.on('data', (data) => {
          const err = data.toString();
          console.error(`[Renderer stderr]: ${err}`);
          errorLog += err;
        });

        renderProcess.on('close', (code) => {
          console.log(`[IPC] Renderer exited with code ${code}`);
          // cleanup temp file
          try { if (fs.existsSync(configPath)) fs.unlinkSync(configPath); } catch(e){}
          
          if (code === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            resolve({ success: true, outputPath: outputPath, elapsed: elapsed });
          } else {
            resolve({ success: false, error: errorLog || `Process exited with code ${code}` });
          }
        });

      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  });
  ipcMain.removeHandler('cut-silence');
  ipcMain.handle('cut-silence', async (event, params) => {
    const { videoPath, threshold, minDuration, prePad, postPad } = params;
    console.log(`[IPC] Requested silence removal for: ${videoPath} with thresh=${threshold}, minDur=${minDuration}, prePad=${prePad}, postPad=${postPad}`);
    const parsedPath = path.parse(videoPath);
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_cut${parsedPath.ext}`);
    
    return new Promise((resolve, reject) => {
      try {
        event.sender.send('cut-silence-progress', { status: 'Analyzing audio levels...' });
        const startTime = Date.now();
        
        // auto-editor params
        const editExp = `audio:threshold=${threshold}dB,stream=all`;
        // auto-editor --margin A,B means:
        //   A = keep N secs at start of silence (before speech) = prePad
        //   B = keep N secs at end of silence (after speech) = postPad
        const marginStr = `${prePad}s,${postPad}s`;

        const args = ['-m', 'auto_editor', videoPath, '--edit', editExp, '--margin', marginStr, '-o', outputPath];
        const cutProcess = spawn('python', args);

        let errorLog = '';

        cutProcess.stdout.on('data', (data) => {
          const out = data.toString().trim();
          if (out) {
            console.log(`[Auto-Editor]: ${out}`);
            if (out.includes('%') || out.includes('ETA') || out.includes('done')) {
               event.sender.send('cut-silence-progress', { status: out });
            }
          }
        });

        cutProcess.stderr.on('data', (data) => {
          const err = data.toString();
          console.error(`[Auto-Editor stderr]: ${err}`);
          errorLog += err;
        });

        cutProcess.on('close', (code) => {
          console.log(`[IPC] Auto-Editor exited with code ${code}`);
          if (code === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            resolve({ success: true, outputPath, elapsed });
          } else {
            resolve({ success: false, error: errorLog || `Process exited with code ${code}` });
          }
        });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    });
  });

  ipcMain.removeHandler('scan-silence');
  ipcMain.handle('scan-silence', async (event, params) => {
    const { videoPath, threshold, minDuration, duration } = params;
    console.log(`[IPC] Scanning silence: ${videoPath} th=${threshold} min=${minDuration}`);
    return new Promise((resolve, reject) => {
      // silencedetect=noise=-35dB:d=0.5
      const args = ['-i', videoPath, '-af', `silencedetect=noise=${threshold}dB:d=${minDuration}`, '-f', 'null', '-'];
      const proc = spawn(ffmpegPath, args);
      let stderrLog = '';

      proc.on('error', (err) => {
        console.error(`[FFmpeg Error in scan-silence]: ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      proc.stderr.on('data', (data) => {
        const out = data.toString();
        stderrLog += out;
        
        if (duration && out.includes('time=')) {
           const match = out.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
           if (match) {
              const h = parseInt(match[1]);
              const m = parseInt(match[2]);
              const s = parseFloat(match[3]);
              const t = h * 3600 + m * 60 + s;
              let pct = Math.round((t / duration) * 100);
              if (pct > 100) pct = 100;
              event.sender.send('scan-silence-progress', pct);
           }
        }
      });

      proc.on('close', (code) => {
        const silences = [];
        const regex = /silence_start:\s*([\d.]+).*?silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/gs;
        let match;
        while ((match = regex.exec(stderrLog)) !== null) {
          silences.push({
            start: parseFloat(match[1]),
            end: parseFloat(match[2]),
            duration: parseFloat(match[3])
          });
        }
        resolve({ success: true, silences });
      });
    });
  });

  ipcMain.removeHandler('get-audio-peaks');
  ipcMain.handle('get-audio-peaks', async (event, videoPath) => {
    console.log(`[IPC] Extracting audio peaks for: ${videoPath}`);
    return new Promise((resolve, reject) => {
      // 8000 Hz preserves human voice frequencies. 
      // Downsampling to 100Hz directly in FFmpeg applies a 50Hz low-pass filter which destroys voice!
      const args = ['-i', videoPath, '-ac', '1', '-ar', '8000', '-f', 'f32le', 'pipe:1'];
      const proc = spawn(ffmpegPath, args);
      const chunks = [];
      
      proc.on('error', (err) => {
        console.error(`[FFmpeg Error in get-audio-peaks]: ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      proc.stdout.on('data', chunk => chunks.push(chunk));
      
      proc.on('close', code => {
        if (code !== 0 && chunks.length === 0) {
          return resolve({ success: false, error: 'FFmpeg failed to extract audio' });
        }
        const buffer = Buffer.concat(chunks);
        const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
        
        // Compress 8000Hz raw audio into 100Hz envelope peaks (min/max pairs)
        const SAMPLES_PER_PEAK = 80; // 8000 / 100 = 80
        const numPeaks = Math.ceil(floatArray.length / SAMPLES_PER_PEAK);
        const peaks = new Float32Array(numPeaks * 2);

        for (let i = 0; i < numPeaks; i++) {
          let max = -Infinity;
          let min = Infinity;
          const start = i * SAMPLES_PER_PEAK;
          const end = Math.min(start + SAMPLES_PER_PEAK, floatArray.length);
          for (let j = start; j < end; j++) {
            const val = floatArray[j];
            if (val > max) max = val;
            if (val < min) min = val;
          }
          peaks[i*2] = min;
          peaks[i*2 + 1] = max;
        }

        resolve({ success: true, peaks, sampleRate: 100 });
      });
    });
  });

  ipcMain.removeHandler('open-file-dialog');
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Video File',
      filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'mov', 'webm', 'avi'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

module.exports = { setupIpcHandlers };
