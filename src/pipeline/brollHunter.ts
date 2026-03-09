import OpenAI from "openai";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type BRollClip = {
  id: string;
  title: string;
  url: string;
};

export type BRollMoment = {
  index: number;
  scriptLine: string;
  visualNeed: string;
  section: string;
  searchQuery: string;
  clips: BRollClip[];
  topClip: BRollClip | null;
};

export type HuntResult = {
  moments: BRollMoment[];
  generatedAt: Date;
};

function getOpenRouter(): OpenAI {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });
}

async function analyzeScript(script: string): Promise<
  Array<{
    scriptLine: string;
    visualNeed: string;
    section: string;
    searchQuery: string;
  }>
> {
  const client = getOpenRouter();
  const response = await client.chat.completions.create({
    model: "anthropic/claude-sonnet-4",
    messages: [
      {
        role: "system",
        content: `You analyze sports video scripts and identify b-roll moments. For each distinct visual need, output a JSON array.

Each element must have:
- scriptLine: the relevant quote from the script (5-10 words)
- visualNeed: what should be shown on screen (concise, descriptive)
- section: "hook" | "body" | "cta"
- searchQuery: a YouTube search query (5-8 words, specific player/team/action, no quotes needed)

Target 1 moment per 8-10 seconds of video (4-7 moments for a 45-60s video).
Output ONLY a valid JSON array, no explanation.`,
      },
      {
        role: "user",
        content: `Analyze this sports betting script for b-roll moments:\n\n${script}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content || "[]";
  const cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    console.log("  [BRoll] Could not parse Claude moment analysis, using empty list");
    return [];
  }
}

async function searchYouTube(query: string): Promise<BRollClip[]> {
  try {
    console.log(`  [BRoll] Searching YouTube: "${query}"`);
    const { stdout } = await execAsync(
      `yt-dlp "ytsearch3:${query}" --flat-playlist -J --no-playlist`,
      { timeout: 30000 }
    );
    const data = JSON.parse(stdout.trim());
    const entries: any[] = data.entries || [];
    return entries
      .map((e: any) => ({
        id: e.id || "",
        title: e.title || "",
        url: e.url || e.webpage_url || `https://www.youtube.com/watch?v=${e.id}`,
      }))
      .filter((c) => c.id);
  } catch (err: any) {
    console.log(`  [BRoll] YouTube search failed for "${query}": ${err.message?.slice(0, 120)}`);
    return [];
  }
}

export async function huntBRoll(script: string): Promise<HuntResult> {
  console.log("  [BRoll] Analyzing script for visual moments...");
  const analysis = await analyzeScript(script);
  console.log(`  [BRoll] ${analysis.length} visual moments identified`);

  const moments: BRollMoment[] = [];
  for (let i = 0; i < analysis.length; i++) {
    const a = analysis[i];
    const clips = await searchYouTube(a.searchQuery);
    console.log(`  [BRoll] Moment ${i + 1}/${analysis.length}: "${a.visualNeed}" — ${clips.length} clips found`);
    moments.push({
      index: i,
      scriptLine: a.scriptLine,
      visualNeed: a.visualNeed,
      section: a.section,
      searchQuery: a.searchQuery,
      clips,
      topClip: clips[0] || null,
    });
  }

  return { moments, generatedAt: new Date() };
}
