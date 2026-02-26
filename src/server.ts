import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import axios from "axios";
import { renderVideo } from "./pipeline/render";
import { scripterOutputToVideoInput } from "./scripterConnector";
import { extractTranscript } from "./scripter/transcript";
import { generateScript } from "./scripter/generate";
import type { VideoInput } from "./types";
import type { ScripterSettings } from "./scripter/types";

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;

// CORS
app.use(
  cors({
    origin: [
      "https://novig-scripter.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
  })
);
app.use(express.json({ limit: "10mb" }));

// Serve dashboard
app.use(express.static(path.join(process.cwd(), "public")));

// --- Render history (in-memory, last 10) ---
type RenderRecord = {
  id: string;
  title: string;
  date: string;
  filePath: string;
  createdAt: string;
  durationMs: number;
  fileSize: number;
};
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

// --- ENV validation ---
function validateEnv() {
  const keys = ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "OPENROUTER_API_KEY", "GOOGLE_AI_KEY"];
  for (const key of keys) {
    const val = process.env[key];
    if (val && val.length > 5) {
      console.log(`  ✅ ${key}: set`);
    } else {
      console.log(`  ⚠️  ${key}: not set`);
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
    endpoints: ["/render", "/render-from-script", "/render-from-url", "/renders/:id", "/history", "/api/generate"],
    cors: ["https://novig-scripter.vercel.app"],
    studioAvailable: !isProd,
  });
});

// Render history list
app.get("/history", (_req, res) => {
  res.json(
    renderHistory.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date,
      createdAt: r.createdAt,
      durationMs: r.durationMs,
      fileSize: r.fileSize,
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

// Helper: render and respond
async function doRender(input: VideoInput, res: express.Response) {
  const startTime = Date.now();
  const outputPath = await renderVideo(input);
  const elapsed = Date.now() - startTime;
  const stat = fs.statSync(outputPath);

  const id = crypto.randomUUID().slice(0, 8);
  addToHistory({
    id,
    title: input.title,
    date: input.date,
    filePath: outputPath,
    createdAt: new Date().toISOString(),
    durationMs: elapsed,
    fileSize: stat.size,
  });

  console.log(`  Completed in ${(elapsed / 1000).toFixed(1)}s → ${outputPath} (id: ${id})`);

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
  console.log(`\n[${new Date().toISOString()}] POST /render — "${input.title}"`);
  try {
    await doRender(input, res);
  } catch (err: any) {
    console.error("  Render failed:", err.message);
    res.status(500).json({ error: "Render failed", message: err.message });
  }
});

// Render from scripter output
app.post("/render-from-script", async (req, res) => {
  const { script, title, date, handle, players } = req.body;
  if (!script) {
    res.status(400).json({ error: "Missing 'script' field" });
    return;
  }
  console.log(`\n[${new Date().toISOString()}] POST /render-from-script — "${title || "untitled"}"`);
  try {
    const videoInput = scripterOutputToVideoInput({ script, title, date, handle, players });
    console.log(`  Generated ${videoInput.broll.length} b-roll slots, ${videoInput.script.length} segments`);
    await doRender(videoInput, res);
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
  console.log(`\n[${new Date().toISOString()}] POST /render-from-url — ${scripterUrl}`);
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

  console.log(`\n[${new Date().toISOString()}] POST /api/generate — url: ${url || "(manual)"}`);

  try {
    // Step 1: Extract transcript
    const transcriptResult = await extractTranscript(url, manualTranscript);
    console.log(
      `  Transcript: ${transcriptResult.text.length} chars via ${transcriptResult.method}`
    );

    // Step 2: Generate script
    const result = await generateScript(transcriptResult.text, settings);

    // Return full result
    res.json({
      ...result,
      videoTitle: transcriptResult.videoTitle,
      channel: transcriptResult.channel,
      videoId: transcriptResult.videoId,
      platform: transcriptResult.platform,
      transcript: transcriptResult.text,
    });
  } catch (err: any) {
    console.error("  Script generation failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Startup ---
console.log("\n🎬 Novig Video Engine — Starting up...\n");
validateEnv();
console.log(`\n  Environment: ${isProd ? "production" : "development"}`);

// Ensure directories
for (const dir of ["output", "public/assets"]) {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
}

if (process.env.RAILWAY_STATIC_URL) {
  console.log(`  Railway URL: ${process.env.RAILWAY_STATIC_URL}`);
}

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`   Config:    http://localhost:${PORT}/config`);
  console.log(`   Render:    POST http://localhost:${PORT}/render`);
  console.log(`   Script:    POST http://localhost:${PORT}/render-from-script`);
  console.log(`   URL:       POST http://localhost:${PORT}/render-from-url`);
  if (!isProd) {
    console.log(`   Studio:    http://localhost:3001 (run npm run studio separately)`);
  }
  console.log("");
});
