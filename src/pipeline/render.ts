import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { generateAudio } from "./generateAudio";
import { resolveAssets } from "./resolveAssets";
import type { VideoInput, SportsVideoProps } from "../types";

export async function renderVideo(input: VideoInput, outputOverride?: string): Promise<string> {
  console.log("\n=== NOVIG VIDEO ENGINE ===\n");
  console.log("Step 1: Combining script segments...");
  const fullScript = input.script.map((s) => s.text).join(" ");
  console.log(`  Script: "${fullScript.substring(0, 80)}..."`);

  console.log("\nStep 2: Generating audio...");
  const { audioPath, timestamps } = await generateAudio(fullScript);
  console.log(`  Audio: ${audioPath}`);
  console.log(`  Words: ${timestamps.length}`);

  console.log("\nStep 3: Resolving assets...");
  const resolvedBroll = await resolveAssets(input.broll);

  // Calculate duration from timestamps or default
  const lastWord = timestamps[timestamps.length - 1];
  const audioDuration = lastWord ? lastWord.end + 0.5 : 15;
  const fps = 30;
  const durationInFrames = Math.ceil(audioDuration * fps);
  console.log(`\nStep 4: Duration = ${audioDuration.toFixed(1)}s (${durationInFrames} frames @ ${fps}fps)`);

  // Update broll endFrame if needed to fit audio
  const updatedInput: VideoInput = {
    ...input,
    broll: resolvedBroll.map((slot, i) => {
      const segmentDuration = Math.floor(durationInFrames / resolvedBroll.length);
      return {
        ...slot,
        startFrame: i * segmentDuration,
        endFrame: (i + 1) * segmentDuration,
      };
    }),
  };

  console.log("\nStep 5: Bundling Remotion project...");
  const entryPoint = path.join(process.cwd(), "src", "index.ts");
  const bundleLocation = await bundle({
    entryPoint,
    onProgress: (progress) => {
      if (progress % 25 === 0) {
        console.log(`  Bundle progress: ${progress}%`);
      }
    },
  });
  console.log("  Bundle complete.");

  console.log("\nStep 6: Selecting composition...");
  const inputProps: SportsVideoProps = {
    input: updatedInput,
    words: timestamps,
    audioSrc: audioPath,
    durationInFrames,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "SportsVideo",
    inputProps,
  });

  // Override duration with our calculated value
  composition.durationInFrames = durationInFrames;

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = outputOverride || path.join(outputDir, `video_${new Date().toISOString().replace(/[:.]/g, "-")}.mp4`);

  console.log("\nStep 7: Rendering video...");
  const RENDER_TIMEOUT_MS = 5 * 60 * 1000;

  await Promise.race([
    renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct % 10 === 0) {
          process.stdout.write(`\r  Render progress: ${pct}%`);
        }
      },
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Render timed out after 5 minutes")), RENDER_TIMEOUT_MS)
    ),
  ]);

  console.log(`\n  Render complete!`);

  // Cleanup: remove audio file so it doesn't persist between renders
  const audioFile = path.join(process.cwd(), "public", "assets", "audio.mp3");
  if (fs.existsSync(audioFile)) {
    fs.unlinkSync(audioFile);
    console.log("  Cleaned up audio file");
  }

  console.log(`\nOutput: ${outputPath}`);
  console.log("\n=========================\n");

  return outputPath;
}
