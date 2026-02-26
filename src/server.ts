import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { renderVideo } from "./pipeline/render";
import { scripterOutputToVideoInput } from "./scripterConnector";
import type { VideoInput } from "./types";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ENV validation
function validateEnv() {
  const checks = [
    { key: "ELEVENLABS_API_KEY", required: false },
    { key: "ELEVENLABS_VOICE_ID", required: false },
    { key: "OPENROUTER_API_KEY", required: false },
  ];

  for (const check of checks) {
    const val = process.env[check.key];
    if (val && val.length > 5) {
      console.log(`  ✅ ${check.key}: set`);
    } else {
      console.log(`  ⚠️  ${check.key}: not set${check.required ? " (REQUIRED)" : ""}`);
    }
  }
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Direct render from VideoInput
app.post("/render", async (req, res) => {
  const startTime = Date.now();
  const input: VideoInput = req.body;

  if (!input || !input.script || !input.title) {
    res.status(400).json({ error: "Invalid VideoInput: missing script or title" });
    return;
  }

  console.log(`\n[${new Date().toISOString()}] POST /render — "${input.title}"`);

  try {
    const outputPath = await renderVideo(input);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Completed in ${elapsed}s → ${outputPath}`);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="novig-${Date.now()}.mp4"`);
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on("end", () => {
      fs.unlinkSync(outputPath);
    });
  } catch (err: any) {
    console.error("  Render failed:", err.message);
    res.status(500).json({ error: "Render failed", message: err.message });
  }
});

// Render from scripter output (simpler input)
app.post("/render-from-script", async (req, res) => {
  const startTime = Date.now();
  const { script, title, date, handle, players } = req.body;

  if (!script) {
    res.status(400).json({ error: "Missing 'script' field in request body" });
    return;
  }

  console.log(`\n[${new Date().toISOString()}] POST /render-from-script — "${title || "untitled"}"`);

  try {
    const videoInput = scripterOutputToVideoInput({ script, title, date, handle, players });
    console.log(`  Generated ${videoInput.broll.length} b-roll slots, ${videoInput.script.length} script segments`);

    const outputPath = await renderVideo(videoInput);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Completed in ${elapsed}s → ${outputPath}`);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="novig-${Date.now()}.mp4"`);
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on("end", () => {
      fs.unlinkSync(outputPath);
    });
  } catch (err: any) {
    console.error("  Render failed:", err.message);
    res.status(500).json({ error: "Render failed", message: err.message });
  }
});

const PORT = process.env.PORT || 3000;

console.log("\n🎬 Novig Video Engine — Starting up...\n");
validateEnv();
console.log("");

// Ensure output directory exists
const outputDir = path.join(process.cwd(), "output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Render: POST http://localhost:${PORT}/render`);
  console.log(`   Script: POST http://localhost:${PORT}/render-from-script\n`);
});
