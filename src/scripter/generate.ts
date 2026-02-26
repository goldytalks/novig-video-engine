import OpenAI from "openai";
import type {
  ScripterSettings,
  ScriptSections,
  EditingTimeline,
  TimelineClip,
} from "./types";

const WORDS_PER_SECOND = 2.8;

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

function buildSystemPrompt(settings: ScripterSettings): string {
  const wordTarget = Math.round(settings.targetSeconds * WORDS_PER_SECOND);
  const hookWords = Math.round(3 * WORDS_PER_SECOND);
  const ctaWords = Math.round(4 * WORDS_PER_SECOND);
  const bodyWords = wordTarget - hookWords - ctaWords;

  const styleGuide: Record<string, string> = {
    hype: "High energy, bold claims, urgency, exclamation points. Like a confident friend texting you a lock.",
    analytical:
      "Data-driven, stat-heavy, measured confidence. Like a sharp analyst breaking down the numbers.",
    casual:
      "Conversational, relaxed, authentic. Like a buddy at the bar sharing a pick over beers.",
  };

  return `You are an elite short-form sports betting script writer for Novig — a zero-vig sports betting exchange with the best odds in the industry.

STYLE: ${settings.style.toUpperCase()} — ${styleGuide[settings.style]}

STRUCTURE:
- [HOOK] (~3 seconds, ~${hookWords} words): Must STOP THE SCROLL. Bold claim, FOMO, controversy, surprising stat. NEVER start with "Hey guys" or "What's up". Jump straight into the most compelling thing.
- [BODY] (~${settings.targetSeconds - 7} seconds, ~${bodyWords} words): The meat. Preserve ALL picks, odds, teams, player names, and numbers from the source transcript. Never fabricate stats or picks. Add context, analysis, and confidence.
- [CTA] (~4 seconds, ~${ctaWords} words): Always end with: "Stop leaving money on the table. Get the best odds on Novig — link in bio."

RULES:
- Total target: ~${wordTarget} words (~${settings.targetSeconds} seconds at ${WORDS_PER_SECOND} words/sec)
- Maximum 2 natural Novig mentions (including CTA)
- Keep the same picks/teams/lines from the source — rewrite the DELIVERY not the CONTENT
${settings.includeGraphics ? '- Mark key visual moments with [GFX: description] inline' : "- No graphics markers"}
${settings.includeStats ? '- Mark stats with [STAT: number/comparison] inline' : "- No stat markers"}

OUTPUT FORMAT:
First output the script in this exact format:

[HOOK]
(hook text here)

[BODY]
(body text here)

[CTA]
(cta text here)

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
  const ctaMatch = raw.match(/\[CTA\]\s*\n([\s\S]*?)(?=---|$)/i);

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

  let userPrompt = `Here is the source transcript from a sports betting video. Rewrite it into a Novig-branded script following the structure above.\n\nSOURCE TRANSCRIPT:\n${transcript}`;

  if (settings.customHook) {
    userPrompt += `\n\nIMPORTANT: The user wants this EXACT hook used verbatim (do not change it):\n"${settings.customHook}"`;
  }

  const response = await openrouter.chat.completions.create({
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
