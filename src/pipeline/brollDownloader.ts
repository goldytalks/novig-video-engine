import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { HuntResult, BRollMoment } from "./brollHunter";

const execAsync = promisify(exec);

export type DownloadStatus = "success" | "failed" | "skipped";

export type DownloadResult = {
  momentIndex: number;
  slug: string;
  visualNeed: string;
  url: string;
  filePath: string | null;
  status: DownloadStatus;
  error?: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function downloadClip(moment: BRollMoment, brollDir: string): Promise<DownloadResult> {
  const slug = `${String(moment.index + 1).padStart(2, "0")}-${slugify(moment.visualNeed)}`;

  if (!moment.topClip) {
    return {
      momentIndex: moment.index,
      slug,
      visualNeed: moment.visualNeed,
      url: "",
      filePath: null,
      status: "skipped",
    };
  }

  const outPath = path.join(brollDir, `${slug}.mp4`);
  const url = moment.topClip.url;

  try {
    console.log(`  [BRoll] Downloading ${slug} from ${url}`);
    await execAsync(
      `yt-dlp --no-playlist --format "bestvideo[height<=720]+bestaudio/best[height<=720]" --merge-output-format mp4 -o "${outPath}" "${url}"`,
      { timeout: 120000 }
    );
    console.log(`  [BRoll] ✓ ${slug}.mp4`);
    return { momentIndex: moment.index, slug, visualNeed: moment.visualNeed, url, filePath: outPath, status: "success" };
  } catch (err: any) {
    console.log(`  [BRoll] ✗ ${slug} failed: ${err.message?.slice(0, 120)}`);
    return { momentIndex: moment.index, slug, visualNeed: moment.visualNeed, url, filePath: null, status: "failed", error: err.message };
  }
}

export async function downloadBRoll(
  huntResult: HuntResult,
  onProgress?: (result: DownloadResult) => void
): Promise<DownloadResult[]> {
  const brollDir = path.join(process.cwd(), "broll");
  if (!fs.existsSync(brollDir)) fs.mkdirSync(brollDir, { recursive: true });

  const withClips = huntResult.moments.filter((m) => m.topClip);
  const noClips = huntResult.moments.filter((m) => !m.topClip);
  const results: DownloadResult[] = [];

  // Max 3 parallel downloads
  for (let i = 0; i < withClips.length; i += 3) {
    const chunk = withClips.slice(i, i + 3);
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

  // Add skipped entries for moments with no clips found
  for (const m of noClips) {
    const r: DownloadResult = {
      momentIndex: m.index,
      slug: `${String(m.index + 1).padStart(2, "0")}-${slugify(m.visualNeed)}`,
      visualNeed: m.visualNeed,
      url: "",
      filePath: null,
      status: "skipped",
    };
    if (onProgress) onProgress(r);
    results.push(r);
  }

  return results.sort((a, b) => a.momentIndex - b.momentIndex);
}
