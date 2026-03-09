import fs from "fs";
import path from "path";
import type { BRollSlot } from "../types";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function resolveAssets(broll: BRollSlot[]): Promise<BRollSlot[]> {
  const brollDir = path.join(process.cwd(), "public", "broll");

  if (!fs.existsSync(brollDir)) {
    console.log(`  [Assets] No broll/ directory found — all slots will use placeholders`);
    return broll;
  }

  const files = fs.readdirSync(brollDir).filter(f => f.endsWith(".mp4"));
  console.log(`  [Assets] Found ${files.length} clips in broll/`);

  return broll.map(slot => {
    const targets = [
      slot.playerName ? slugify(slot.playerName) : null,
      slugify(slot.label),
      slot.id,
    ].filter(Boolean) as string[];

    const match = files.find(f => {
      const base = slugify(f.replace(".mp4", ""));
      return targets.some(t => base.includes(t) || t.includes(base));
    });

    if (match) {
      console.log(`  [Assets] Matched "${slot.label}" -> broll/${match}`);
      return { ...slot, asset: `broll/${match}` };
    }

    return slot;
  });
}
