import type { BRollSlot } from "../types";

export async function resolveAssets(broll: BRollSlot[]): Promise<BRollSlot[]> {
  // TODO: resolve yt-dlp clips here when footage library is ready
  console.log(`  [Assets] Resolved ${broll.length} b-roll slots (placeholder mode)`);
  return broll;
}
