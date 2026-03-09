import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import axios from "axios";
import { createProxyMiddleware } from "http-proxy-middleware";
import { renderVideo } from "./pipeline/render";
import { scripterOutputToVideoInput } from "./scripterConnector";
import { extractTranscript } from "./scripter/transcript";
import { generateScript } from "./scripter/generate";
import { huntBRoll } from "./pipeline/brollHunter";
import { downloadBRoll } from "./pipeline/brollDownloader";
import type { DownloadResult } from "./pipeline/brollDownloader";
import type { VideoInput } from "./types";
import type { ScripterSettings } from "./scripter/types";

const app = express();
const isProd = process.env.NODE_ENV === "production" || !!process.env.RAILWAY_STATIC_URL;
const PORT = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: [
      "https://novig-scripter.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
      /\.railway\.app$/,
      /\.vercel\.app$/,
    ],
  })
);
app.use(express.json({ limit: "10mb" }));

// Serve dashboard
app.use(express.static(path.join(process.cwd(), "public")));

// --- Render history (in-memory, last 10) ---
interface RenderRecord {
  id: string;
  title: string;
  script: string;
  hookId?: string;
  createdAt: Date;
  durationSeconds: number;
  filePath: string;
}
const renderHistory: RenderRecord[] = [];

function addToHistory(record: RenderRecord) {
  renderHistory.unshift(record);
  // Clean up old files beyond 10
  while (renderHistory.length > 10) {
    const old = renderHistory.pop();
    if (old && fs.existsSync(old.filePath)) {
      fs.unlinkSync(old.filePath);
    }
  }
}

// --- B-Roll state (in-memory, reset on each new generate) ---
type BRollClipState = {
  slug: string;
  visualNeed: string;
  searchQuery: string;
  filePath: string | null;
  status: "downloading" | "downloaded" | "failed";
};

type BRollState = {
  status: "idle" | "hunting" | "downloading" | "ready" | "error";
  clips: BRollClipState[];
  lastUpdated: Date | null;
  error?: string;
};

const brollState: BRollState = {
  status: "idle",
  clips: [],
  lastUpdated: null,
};

async function runBRollPipeline(fullScript: string): Promise<void> {
  try {
    // Phase 1: Hunt
    brollState.status = "hunting";
    brollState.clips = [];
    brollState.lastUpdated = new Date();
    console.log("\n  [BRoll] Starting hunt phase...");

    const huntResult = await huntBRoll(fullScript);

    // Seed clip states from hunt results so UI shows queued clips immediately
    brollState.clips = huntResult.moments.map((m) => ({
      slug: m.slugName,
      visualNeed: m.visualNeed,
      searchQuery: m.searchQuery,
      filePath: null,
      status: "downloading",
    }));
    brollState.status = "downloading";
    brollState.lastUpdated = new Date();

    // Phase 2: Download
    console.log("\n  [BRoll] Starting download phase...");
    await downloadBRoll(huntResult, (result: DownloadResult) => {
      const clip = brollState.clips.find((c) => c.slug === result.slug);
      if (clip) {
        clip.filePath = result.filePath;
        clip.status = result.status === "success" ? "downloaded" : "failed";
        brollState.lastUpdated = new Date();
      }
    });

    brollState.status = "ready";
    brollState.lastUpdated = new Date();
    console.log(`\n  [BRoll] Pipeline complete — ${brollState.clips.filter((c) => c.status === "downloaded").length}/${brollState.clips.length} clips downloaded`);
  } catch (err: any) {
    brollState.status = "error";
    brollState.error = err.message;
    brollState.lastUpdated = new Date();
    console.error("  [BRoll] Pipeline failed:", err.message);
  }
}

// --- ENV validation ---
function validateEnv() {
  const keys = ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "OPENROUTER_API_KEY", "GOOGLE_AI_KEY"];
  for (const key of keys) {
    const val = process.env[key];
    if (val && val.length > 5) {
      console.log(`  OK ${key}: set`);
    } else {
      console.log(`  WARN ${key}: not set`);
    }
  }
}

// --- Routes ---

// Health
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: isProd ? "production" : "development",
    version: "1.0.0",
  });
});

// Config (for scripter frontend discovery)
app.get("/config", (_req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    studioAvailable: !isProd,
    endpoints: ["/health", "/config", "/render", "/render-from-script", "/renders", "/renders/:id", "/api/transcribe", "/api/generate", "/studio"],
    cors: ["novig-scripter.vercel.app", "*.railway.app", "*.vercel.app"],
  });
});

// Render history list
app.get("/renders", (_req, res) => {
  res.json(
    renderHistory.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      durationSeconds: r.durationSeconds,
      hookId: r.hookId,
    }))
  );
});

// Backward compat: /history -> same as /renders
app.get("/history", (_req, res) => {
  res.json(
    renderHistory.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      durationSeconds: r.durationSeconds,
      hookId: r.hookId,
    }))
  );
});

// Download a past render
app.get("/renders/:id", (req, res) => {
  const record = renderHistory.find((r) => r.id === req.params.id);
  if (!record || !fs.existsSync(record.filePath)) {
    res.status(404).json({ error: "Render not found" });
    return;
  }
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="novig-${record.id}.mp4"`);
  fs.createReadStream(record.filePath).pipe(res);
});

// Delete a past render
app.delete("/renders/:id", (req, res) => {
  const idx = renderHistory.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Render not found" });
    return;
  }
  const record = renderHistory[idx];
  if (fs.existsSync(record.filePath)) {
    fs.unlinkSync(record.filePath);
  }
  renderHistory.splice(idx, 1);
  res.json({ ok: true, id: record.id });
});

// Helper: render and respond
async function doRender(input: VideoInput, res: express.Response, hookId?: string) {
  const startTime = Date.now();
  const id = crypto.randomUUID().slice(0, 8);
  const outputDir = path.join(process.cwd(), "output");
  const outputPath = path.join(outputDir, `${id}.mp4`);

  await renderVideo(input, outputPath);
  const elapsed = Date.now() - startTime;

  addToHistory({
    id,
    title: input.title,
    script: typeof input.script === "string" ? input.script : JSON.stringify(input.script),
    hookId,
    createdAt: new Date(),
    durationSeconds: Math.round(elapsed / 1000),
    filePath: outputPath,
  });

  console.log(`  Completed in ${(elapsed / 1000).toFixed(1)}s -> ${outputPath} (id: ${id})`);

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="novig-${id}.mp4"`);
  res.setHeader("X-Render-Id", id);
  fs.createReadStream(outputPath).pipe(res);
}

// Direct render from VideoInput
app.post("/render", async (req, res) => {
  const input: VideoInput = req.body;
  if (!input || !input.script || !input.title) {
    res.status(400).json({ error: "Invalid VideoInput: missing script or title" });
    return;
  }
  console.log(`\n[${new Date().toISOString()}] POST /render -- "${input.title}"`);
  try {
    await doRender(input, res);
  } catch (err: any) {
    console.error("  Render failed:", err.message);
    res.status(500).json({ error: "Render failed", message: err.message });
  }
});

// Render from scripter output
app.post("/render-from-script", async (req, res) => {
  const { script, title, date, handle, players, hookId } = req.body;
  if (!script) {
    res.status(400).json({ error: "Missing 'script' field" });
    return;
  }
  console.log(`\n[${new Date().toISOString()}] POST /render-from-script -- "${title || "untitled"}"`);
  try {
    const videoInput = scripterOutputToVideoInput({ script, title, date, handle, players });
    console.log(`  Generated ${videoInput.broll.length} b-roll slots, ${videoInput.script.length} segments`);
    await doRender(videoInput, res, hookId);
  } catch (err: any) {
    console.error("  Render failed:", err.message);
    res.status(500).json({ error: "Render failed", message: err.message });
  }
});

// Render from scripter URL
app.post("/render-from-url", async (req, res) => {
  const { scripterUrl } = req.body;
  if (!scripterUrl) {
    res.status(400).json({ error: "Missing 'scripterUrl' field" });
    return;
  }
  console.log(`\n[${new Date().toISOString()}] POST /render-from-url -- ${scripterUrl}`);
  try {
    const { data } = await axios.get(scripterUrl);
    const videoInput = scripterOutputToVideoInput({
      script: data.script || data.text,
      title: data.title,
      date: data.date,
      handle: data.handle,
      players: data.players,
    });
    await doRender(videoInput, res);
  } catch (err: any) {
    console.error("  Render failed:", err.message);
    res.status(500).json({ error: "Render failed", message: err.message });
  }
});

// --- Standalone Transcription ---
app.post("/api/transcribe", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "Missing url" });
    return;
  }

  console.log(`\n[${new Date().toISOString()}] POST /api/transcribe -- ${url}`);

  try {
    const result = await extractTranscript(url);
    res.json({
      transcript: result.text,
      platform: result.platform,
      videoTitle: result.videoTitle,
      channel: result.channel,
      videoId: result.videoId,
      method: result.method,
      charCount: result.text.length,
    });
  } catch (err: any) {
    console.error("  Transcription failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Script Generation ---
app.post("/api/generate", async (req, res) => {
  const { url, manualTranscript, settings } = req.body as {
    url?: string;
    manualTranscript?: string;
    settings: ScripterSettings;
  };

  if (!settings) {
    res.status(400).json({ error: "Missing 'settings' field" });
    return;
  }

  console.log(`\n[${new Date().toISOString()}] POST /api/generate -- url: ${url || "(manual)"}`);

  try {
    // Step 1: Extract transcript
    const transcriptResult = await extractTranscript(url, manualTranscript);
    console.log(
      `  Transcript: ${transcriptResult.text.length} chars via ${transcriptResult.method}`
    );

    // Step 2: Generate script
    const result = await generateScript(transcriptResult.text, settings);

    const fullScript = `${result.sections.hook} ${result.sections.body} ${result.sections.cta}`;

    // Return full result immediately (don't wait for b-roll)
    res.json({
      ...result,
      videoTitle: transcriptResult.videoTitle,
      channel: transcriptResult.channel,
      videoId: transcriptResult.videoId,
      platform: transcriptResult.platform,
      transcript: transcriptResult.text,
    });

    // Kick off b-roll pipeline in background (non-blocking)
    brollState.status = "hunting";
    brollState.clips = [];
    brollState.lastUpdated = new Date();
    delete brollState.error;
    runBRollPipeline(fullScript).catch(() => {/* already handled inside */});
  } catch (err: any) {
    console.error("  Script generation failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- B-Roll status ---
app.get("/api/broll-status", (_req, res) => {
  res.json({
    status: brollState.status,
    clips: brollState.clips,
    lastUpdated: brollState.lastUpdated,
    ...(brollState.error ? { error: brollState.error } : {}),
  });
});

// --- Studio proxy (dev only) ---
if (!isProd) {
  app.use(
    "/studio",
    createProxyMiddleware({
      target: "http://localhost:3001",
      changeOrigin: true,
      ws: true,
      on: {
        error: (_err: any, _req: any, res: any) => {
          if (res.writeHead) {
            res.writeHead(502);
            res.end("Remotion Studio not running. Run: npx remotion studio");
          }
        },
      },
    })
  );
}

// --- Startup ---
console.log("\nNovig Video Engine -- Starting up...\n");
validateEnv();
console.log(`\n  Environment: ${isProd ? "production" : "development"}`);

// Ensure directories
for (const dir of ["output", "public/assets"]) {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
}

const railwayUrl = process.env.RAILWAY_STATIC_URL;
if (railwayUrl) {
  console.log(`  Live at: https://${railwayUrl}`);
}

app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`   Config:    http://localhost:${PORT}/config`);
  console.log(`   Render:    POST http://localhost:${PORT}/render`);
  console.log(`   Script:    POST http://localhost:${PORT}/render-from-script`);
  console.log(`   URL:       POST http://localhost:${PORT}/render-from-url`);
  if (!isProd) {
    console.log(`   Studio:    http://localhost:${PORT}/studio`);
  }
  console.log("");
});
