import type { VideoInput, BRollSlot } from "./types";

type ScripterOutput = {
  script: string;
  title?: string;
  date?: string;
  handle?: string;
  players?: string[];
};

export function scripterOutputToVideoInput(output: ScripterOutput): VideoInput {
  const script = output.script.trim();
  const title = output.title || "Sports Picks";
  const date = output.date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const handle = output.handle || "@novig";
  const players = output.players || [];

  // Split script into sentences for segments
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);

  const scriptSegments = sentences.map((text) => ({ text }));

  // Estimate ~3 seconds per broll slot, ~0.35s per word average
  const wordCount = script.split(/\s+/).length;
  const estimatedDuration = wordCount * 0.35;
  const numSlots = Math.max(2, Math.ceil(estimatedDuration / 3));
  const framesPerSlot = Math.floor((estimatedDuration * 30) / numSlots);

  const broll: BRollSlot[] = [];

  for (let i = 0; i < numSlots; i++) {
    const playerIndex = i % Math.max(1, players.length);
    const playerName = players[playerIndex] || undefined;
    const label = playerName || `Game footage`;
    const slotNum = i + 1;

    broll.push({
      id: `slot_${slotNum}`,
      label: `${label}`,
      playerName,
      startFrame: i * framesPerSlot,
      endFrame: (i + 1) * framesPerSlot,
      asset: null,
    });
  }

  return {
    title,
    date,
    handle,
    script: scriptSegments,
    broll,
  };
}
