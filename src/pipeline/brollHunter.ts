import OpenAI from "openai";

export type BRollMoment = {
  index: number;
  slugName: string;
  visualNeed: string;
  section: string;
  searchQuery: string;
};

export type HuntResult = {
  moments: BRollMoment[];
  generatedAt: Date;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function getOpenRouter(): OpenAI {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });
}

async function analyzeScript(script: string): Promise<
  Array<{
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

export async function huntBRoll(script: string): Promise<HuntResult> {
  console.log("  [BRoll] Analyzing script for visual moments...");
  const analysis = await analyzeScript(script);
  console.log(`  [BRoll] ${analysis.length} visual moments identified`);

  const moments: BRollMoment[] = analysis.map((a, i) => ({
    index: i,
    slugName: `${String(i + 1).padStart(2, "0")}-${slugify(a.visualNeed)}`,
    visualNeed: a.visualNeed,
    section: a.section,
    searchQuery: a.searchQuery,
  }));

  for (const m of moments) {
    console.log(`  [BRoll] Moment ${m.index + 1}: "${m.visualNeed}" → query: "${m.searchQuery}"`);
  }

  return { moments, generatedAt: new Date() };
}
