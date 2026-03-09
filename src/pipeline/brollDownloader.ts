import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { HuntResult, BRollMoment } from "./brollHunter";

const execAsync = promisify(exec);

export type DownloadStatus = "success" | "failed";

export type DownloadResult = {
  momentIndex: number;
  slug: string;
  visualNeed: string;
  searchQuery: string;
  filePath: string | null;
  status: DownloadStatus;
  error?: string;
};

async function downloadClip(moment: BRollMoment, brollDir: string): Promise<DownloadResult> {
  const outPath = path.join(brollDir, `${moment.slugName}.mp4`);

  try {
    console.log(`  [BRoll] Downloading "${moment.slugName}" via ytsearch: "${moment.searchQuery}"`);
    await execAsync(
      `yt-dlp "ytsearch1:${moment.searchQuery}" --format "best[height<=720]/best" --merge-output-format mp4 --output "${outPath}" --no-playlist`,
      { timeout: 120000 }
    );
    console.log(`  [BRoll] ✓ ${moment.slugName}.mp4`);
    return {
      momentIndex: moment.index,
      slug: moment.slugName,
      visualNeed: moment.visualNeed,
      searchQuery: moment.searchQuery,
      filePath: outPath,
      status: "success",
    };
  } catch (err: any) {
    console.log(`  [BRoll] ✗ ${moment.slugName} failed: ${err.message?.slice(0, 200)}`);
    return {
      momentIndex: moment.index,
      slug: moment.slugName,
      visualNeed: moment.visualNeed,
      searchQuery: moment.searchQuery,
      filePath: null,
      status: "failed",
      error: err.message,
    };
  }
}

export async function downloadBRoll(
  huntResult: HuntResult,
  onProgress?: (result: DownloadResult) => void
): Promise<DownloadResult[]> {
  const brollDir = path.join(process.cwd(), "public", "broll");
  if (!fs.existsSync(brollDir)) fs.mkdirSync(brollDir, { recursive: true });

  const results: DownloadResult[] = [];

  // Max 3 parallel downloads
  for (let i = 0; i < huntResult.moments.length; i += 3) {
    const chunk = huntResult.moments.slice(i, i + 3);
    const chunkResults = await Promise.all(
      chunk.map((m) =>
        downloadClip(m, brollDir).then((r) => {
          if (onProgress) onProgress(r);
          return r;
        })
      )
    );
    results.push(...chunkResults);
  }

  return results.sort((a, b) => a.momentIndex - b.momentIndex);
}
