import OpenAI from "openai";
import type {
  ScripterSettings,
  ScriptSections,
  EditingTimeline,
  TimelineClip,
} from "./types";

const WORDS_PER_SECOND = 2.8;

let _openrouter: OpenAI | null = null;

function getOpenRouter(): OpenAI {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "placeholder",
    });
  }
  return _openrouter;
}

function buildSystemPrompt(settings: ScripterSettings): string {
  const COMPETITORS = "DraftKings, FanDuel, BetMGM, Chalkboard, PrizePicks, Underdog, ESPN Bet, Caesars, PointsBet, BetRivers, SuperDraft, Sleeper, or any other competing app or sportsbook";

  return `You are a minimal-edit script adapter for Novig — a zero-vig sports betting exchange.

YOUR ONLY JOB is to take the source transcript and make TWO types of changes — nothing else:

1. BRAND SWAP: Replace any mention of ${COMPETITORS} with "Novig". Change only the brand name word(s). Do not change anything else in that sentence.

2. CTA SWAP: Replace the final call-to-action sentence(s) — the part where the speaker plugs their sponsor link, promo code, or app download — with this Novig CTA: "Download Novig — zero vig, best lines anywhere."

STRICT RULES — READ CAREFULLY:
- DO NOT rewrite sentences. DO NOT improve the script. DO NOT add energy or hype.
- DO NOT add words, remove words, or change sentence structure beyond the two swap types above.
- DO NOT change the hook. Use the original opening line(s) verbatim, UNLESS they contain a competitor name.
- DO NOT change tone, pacing, or word choice anywhere except the two swap types.
- Keep every pick, stat, player name, team name, and number exactly as stated in the source.
- The output should read as if the original creator said it — just with Novig instead of the competitor.
${settings.includeGraphics ? '- Mark key visual moments with [GFX: description] inline' : "- No graphics markers"}
${settings.includeStats ? '- Mark stats with [STAT: number/comparison] inline' : "- No stat markers"}

STRUCTURE — split the (minimally edited) script into these labeled sections:

[HOOK]
(first 1-2 sentences of the original script, verbatim unless brand-swapped)

[BODY]
(middle section verbatim, with only brand swaps if needed)

[CTA]
(replace the original sponsor plug with: "Download Novig — zero vig, best lines anywhere.")

---
Then output a JSON block with EXACTLY this structure (valid JSON, no trailing commas):
{"footage":["b-roll suggestion 1","b-roll suggestion 2","b-roll suggestion 3"],"notes":["production note 1","production note 2"],"hookAlts":["alternative hook 1","alternative hook 2","alternative hook 3"]}`;
}

function parseSections(raw: string): {
  sections: ScriptSections;
  footage: string[];
  notes: string[];
  hookAlts: string[];
} {
  const hookMatch = raw.match(/\[HOOK\]\s*\n([\s\S]*?)(?=\[BODY\])/i);
  const bodyMatch = raw.match(/\[BODY\]\s*\n([\s\S]*?)(?=\[CTA\])/i);
  const ctaMatch = raw.match(/\[CTA\]\s*\n([\s\S]*?)(?=---|```|$)/i);

  const hook = hookMatch?.[1]?.trim() || "";
  const body = bodyMatch?.[1]?.trim() || "";
  const cta = ctaMatch?.[1]?.trim() || "";

  // Parse JSON block after ---
  let footage: string[] = [];
  let notes: string[] = [];
  let hookAlts: string[] = [];

  const jsonMatch = raw.match(/---\s*\n([\s\S]*)/);
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1].trim().replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      footage = parsed.footage || [];
      notes = parsed.notes || [];
      hookAlts = parsed.hookAlts || [];
    } catch (e) {
      console.log("  [Script] Could not parse production JSON, using defaults");
    }
  }

  return { sections: { hook, body, cta }, footage, notes, hookAlts };
}

function countWords(text: string): number {
  return text.replace(/\[(?:GFX|STAT):.*?\]/g, "").split(/\s+/).filter(Boolean).length;
}

function extractOverlays(text: string): string[] {
  const matches = text.match(/\[(GFX|STAT):.*?\]/g);
  return matches || [];
}

function buildTimeline(
  sections: ScriptSections,
  footage: string[]
): EditingTimeline {
  const fps = 30;
  const hookWc = countWords(sections.hook);
  const bodyWc = countWords(sections.body);
  const ctaWc = countWords(sections.cta);

  const hookSec = hookWc / WORDS_PER_SECOND;
  const bodySec = bodyWc / WORDS_PER_SECOND;
  const ctaSec = ctaWc / WORDS_PER_SECOND;

  let cursor = 0;
  const clips: TimelineClip[] = [];

  const parts: Array<{ id: string; label: string; text: string; wc: number; dur: number }> = [
    { id: "hook", label: "HOOK", text: sections.hook, wc: hookWc, dur: hookSec },
    { id: "body", label: "BODY", text: sections.body, wc: bodyWc, dur: bodySec },
    { id: "cta", label: "CTA", text: sections.cta, wc: ctaWc, dur: ctaSec },
  ];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const startSec = Math.round(cursor * 100) / 100;
    const endSec = Math.round((cursor + p.dur) * 100) / 100;
    clips.push({
      id: p.id,
      section: p.id,
      label: p.label,
      startSec,
      endSec,
      durationSec: Math.round(p.dur * 100) / 100,
      startFrame: Math.round(startSec * fps),
      endFrame: Math.round(endSec * fps),
      durationFrames: Math.round(p.dur * fps),
      text: p.text,
      wordCount: p.wc,
      footage: footage[i] || "",
      overlays: extractOverlays(p.text),
    });
    cursor += p.dur;
  }

  return {
    fps: 30,
    totalDurationSec: Math.round(cursor * 100) / 100,
    totalFrames: Math.round(cursor * fps),
    clips,
  };
}

export async function generateScript(
  transcript: string,
  settings: ScripterSettings
): Promise<{
  sections: ScriptSections;
  fullScript: string;
  wordCount: number;
  estimatedSeconds: number;
  hookSeconds: number;
  bodySeconds: number;
  ctaSeconds: number;
  backgroundFootage: string[];
  graphicsNeeded: string[];
  productionNotes: string[];
  hookAlternatives: string[];
  timeline: EditingTimeline;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  totalCost: number;
}> {
  console.log("  [Script] Generating script via OpenRouter...");

  const systemPrompt = buildSystemPrompt(settings);

  let userPrompt = `Here is the source transcript. Apply ONLY the two allowed changes (brand swap + CTA swap) and split into [HOOK]/[BODY]/[CTA] sections. Do not rewrite or improve anything else.\n\nSOURCE TRANSCRIPT:\n${transcript}`;

  if (settings.customHook) {
    userPrompt += `\n\nIMPORTANT: The user wants this EXACT hook used verbatim (do not change it):\n"${settings.customHook}"`;
  }

  const response = await getOpenRouter().chat.completions.create({
    model: "anthropic/claude-sonnet-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
  });

  const raw = response.choices[0]?.message?.content || "";
  const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  // Cost: Claude Sonnet ~$3/M input, ~$15/M output
  const costInput = (usage.prompt_tokens / 1_000_000) * 3;
  const costOutput = (usage.completion_tokens / 1_000_000) * 15;
  const totalCost = Math.round((costInput + costOutput) * 10000) / 10000;

  console.log(`  [Script] Got ${raw.length} chars, cost: $${totalCost.toFixed(4)}`);

  const { sections, footage, notes, hookAlts } = parseSections(raw);

  const fullScript = `${sections.hook}\n\n${sections.body}\n\n${sections.cta}`;
  const wc = countWords(fullScript);
  const estSec = wc / WORDS_PER_SECOND;

  const hookWc = countWords(sections.hook);
  const bodyWc = countWords(sections.body);
  const ctaWc = countWords(sections.cta);

  const timeline = buildTimeline(sections, footage);

  // Extract graphics markers
  const allText = fullScript;
  const graphicsNeeded = (allText.match(/\[(GFX|STAT):.*?\]/g) || []).map((m) =>
    m.replace(/^\[|\]$/g, "")
  );

  return {
    sections,
    fullScript,
    wordCount: wc,
    estimatedSeconds: Math.round(estSec * 10) / 10,
    hookSeconds: Math.round((hookWc / WORDS_PER_SECOND) * 10) / 10,
    bodySeconds: Math.round((bodyWc / WORDS_PER_SECOND) * 10) / 10,
    ctaSeconds: Math.round((ctaWc / WORDS_PER_SECOND) * 10) / 10,
    backgroundFootage: footage,
    graphicsNeeded,
    productionNotes: notes,
    hookAlternatives: hookAlts,
    timeline,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    },
    totalCost,
  };
}
