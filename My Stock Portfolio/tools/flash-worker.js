#!/usr/bin/env node

/**
 * Gemini Flash Sub-Agent Worker CLI
 * 
 * Allows Claude Code (cc) and developers to delegate mechanical tasks,
 * file editing, code drafting, refactoring, and data transformations
 * to Gemini Flash (3.8 -> 3.7 -> 3.6 cascade) without burning Claude Pro quota.
 * 
 * Usage:
 *   node tools/flash-worker.js "Your prompt here"
 *   node tools/flash-worker.js -p "Refactor this code" --files "src/app.js" -o "src/app.js"
 *   node tools/flash-worker.js --prompt-file "prompt.md" --files "a.js,b.html" --out "out.js"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Resolve API Key
function resolveApiKey(customKey) {
  if (customKey && customKey.trim()) return customKey.trim();
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) return process.env.GEMINI_API_KEY.trim();

  // Try standard config paths
  const candidatePaths = [
    path.join(__dirname, "tts-sidecar", "config.json"),
    "C:/My Claw/Openclaw-VPS/tools/tts-sidecar/config.json",
    path.join(process.env.USERPROFILE || "", ".gemini", "config.json")
  ];

  for (const cp of candidatePaths) {
    if (fs.existsSync(cp)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(cp, "utf8"));
        const key = parsed?.gemini?.keys?.[0] || parsed?.gemini_api_key || parsed?.apiKey;
        if (key && typeof key === "string" && key.startsWith("AIza")) {
          return key;
        }
      } catch (_) {}
    }
  }

  return null;
}

// 2. Parse CLI Arguments
function parseArgs(args) {
  const options = {
    prompt: "",
    promptFile: "",
    systemInstruction: "",
    files: [],
    out: "",
    model: "",
    temperature: 0.2,
    json: false,
    raw: false,
    code: false,
    apiKey: ""
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-p" || arg === "--prompt") {
      options.prompt = args[++i] || "";
    } else if (arg === "--prompt-file") {
      options.promptFile = args[++i] || "";
    } else if (arg === "-s" || arg === "--system") {
      options.systemInstruction = args[++i] || "";
    } else if (arg === "-f" || arg === "--files" || arg === "--file") {
      const fileList = (args[++i] || "").split(",").map(f => f.trim()).filter(Boolean);
      options.files.push(...fileList);
    } else if (arg === "-o" || arg === "--out") {
      options.out = args[++i] || "";
    } else if (arg === "-m" || arg === "--model") {
      options.model = args[++i] || "";
    } else if (arg === "--temp" || arg === "--temperature") {
      options.temperature = parseFloat(args[++i]) || 0.2;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--raw") {
      options.raw = true;
    } else if (arg === "--code") {
      options.code = true;
      options.raw = true;
    } else if (arg === "--key") {
      options.apiKey = args[++i] || "";
    } else if (!arg.startsWith("-") && !options.prompt) {
      options.prompt = arg;
    }
  }

  return options;
}

// 3. Fallback cascade models
const DEFAULT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest"
];

// 4. Main Query Function
async function callGeminiFlash({ apiKey, prompt, systemInstruction, modelOverride, temperature, timeoutMs = 9000 }) {
  const candidateModels = modelOverride ? [modelOverride, ...DEFAULT_MODELS.filter(m => m !== modelOverride)] : DEFAULT_MODELS;
  let lastError = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature ?? 0.2
      }
    };

    if (systemInstruction && systemInstruction.trim()) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction.trim() }]
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.status === 200) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const usage = data.usageMetadata || {};
        return {
          model,
          text,
          usage,
          status: "success"
        };
      } else {
        const errText = await res.text();
        lastError = new Error(`[${model}] HTTP ${res.status}: ${errText.slice(0, 300)}`);
        // If 503 (high demand) or 429, continue to next model in cascade
        if (res.status === 503 || res.status === 429) {
          process.stderr.write(`[flash-worker] ${model} busy (HTTP ${res.status}), trying next model...\n`);
          continue;
        }
        // If 404 or other deprecation, continue
        if (res.status === 404) {
          continue;
        }
      }
    } catch (e) {
      lastError = e;
      process.stderr.write(`[flash-worker] ${model} request error: ${e.message}\n`);
    }
  }

  throw lastError || new Error("All Gemini Flash models in cascade failed.");
}

// 5. CLI Execution
async function main() {
  const options = parseArgs(process.argv.slice(2));

  // Load prompt from file if specified
  if (options.promptFile) {
    if (fs.existsSync(options.promptFile)) {
      const filePrompt = fs.readFileSync(options.promptFile, "utf8");
      options.prompt = options.prompt ? `${options.prompt}\n\n${filePrompt}` : filePrompt;
    } else {
      console.error(`Error: Prompt file not found: ${options.promptFile}`);
      process.exit(1);
    }
  }

  if (!options.prompt.trim() && options.files.length === 0) {
    console.log(`
Gemini Flash Sub-Agent Worker
Usage:
  node tools/flash-worker.js "prompt" [options]

Options:
  -p, --prompt <text>         Task prompt or instructions
  --prompt-file <path>        Read prompt from a file
  -f, --files <paths>         Comma-separated file paths to include as context
  -o, --out <path>            Write output directly to this file
  -s, --system <text>         System instruction (e.g. "You are an expert coder")
  -m, --model <name>          Specific model (defaults to 3.8-flash -> 3.7 -> 3.6 cascade)
  --temp <float>              Temperature (default: 0.2)
  --json                      Output execution result as JSON
  --raw                       Print raw text output only (stripping markdown codeblocks if single block)
  --key <apiKey>              Explicit Gemini API key
`);
    process.exit(0);
  }

  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    console.error("Error: No Gemini API Key found. Set GEMINI_API_KEY environment variable or pass --key.");
    process.exit(1);
  }

  // Assemble full prompt with files
  let fullPrompt = "";
  if (options.files.length > 0) {
    fullPrompt += "## Context Files Provided:\n\n";
    for (const fpath of options.files) {
      if (fs.existsSync(fpath)) {
        const content = fs.readFileSync(fpath, "utf8");
        const ext = path.extname(fpath).replace(".", "") || "text";
        fullPrompt += `### File: ${fpath}\n\`\`\`${ext}\n${content}\n\`\`\`\n\n`;
      } else {
        process.stderr.write(`[flash-worker] Warning: File not found: ${fpath}\n`);
      }
    }
    fullPrompt += "## Task Instructions:\n";
  }
  fullPrompt += options.prompt;

  const startTime = Date.now();
  try {
    let systemInstruction = options.systemInstruction;
    if (options.code) {
      const codeSystem = "You are an automated code generator sub-agent. Output ONLY valid, runnable code. Do NOT include markdown code fences, do NOT include explanations, introduction, or conversational filler. Return pure source code only.";
      systemInstruction = systemInstruction ? `${systemInstruction}\n\n${codeSystem}` : codeSystem;
    }

    const result = await callGeminiFlash({
      apiKey,
      prompt: fullPrompt,
      systemInstruction,
      modelOverride: options.model,
      temperature: options.temperature
    });

    const elapsedMs = Date.now() - startTime;
    let outputText = result.text.trim();

    // If --code or --raw, extract code block or strip markdown fences
    if (options.code || options.raw) {
      // 1. If full string wrapped in code block
      const fullMatch = outputText.match(/^```(?:\w+)?\r?\n([\s\S]*?)\r?\n```$/);
      if (fullMatch) {
        outputText = fullMatch[1].trim();
      } else if (options.code) {
        // 2. If mixed text, extract the largest markdown code fence
        const codeBlockRegex = /```(?:\w+)?\r?\n([\s\S]*?)\r?\n```/g;
        let match;
        let largestBlock = "";
        while ((match = codeBlockRegex.exec(outputText)) !== null) {
          if (match[1].length > largestBlock.length) {
            largestBlock = match[1];
          }
        }
        if (largestBlock) {
          outputText = largestBlock.trim();
        }
      }
    }

    // Handle output destination
    if (options.out) {
      const outDir = path.dirname(path.resolve(options.out));
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(options.out, outputText, "utf8");
      process.stderr.write(`[flash-worker] Successfully wrote output to ${options.out} (${result.model}, ${elapsedMs}ms)\n`);
    }

    if (options.json) {
      console.log(JSON.stringify({
        status: "success",
        model: result.model,
        elapsed_ms: elapsedMs,
        usage: result.usage,
        output: outputText,
        written_to: options.out || null
      }, null, 2));
    } else if (!options.out) {
      process.stderr.write(`[flash-worker] Output generated via ${result.model} (${elapsedMs}ms)\n`);
      process.stdout.write(outputText + "\n");
    }
  } catch (err) {
    console.error(`[flash-worker] Execution Failed: ${err.message}`);
    process.exit(1);
  }
}

main();
