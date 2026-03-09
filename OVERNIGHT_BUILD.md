# Novig Video Engine — Overnight Build Plan
# Load this into Claude Code desktop and let it run.
# Repo: https://github.com/goldytalks/novig-video-engine

---

## CONTEXT — What This Repo Is

A TypeScript/Express server deployed on Railway that takes a sports betting script and renders a vertical MP4 video (1080x1920, 9:16 for YouTube Shorts/IG Reels). Stack: Remotion for rendering, ElevenLabs for TTS with word-level timestamps, OpenRouter (Claude Sonnet) for script generation, Express for the API.

The pipeline is: URL input → transcript extraction → script generation → ElevenLabs audio → Remotion render → MP4 download.

---

## CURRENT STATE — What's Already Done

- `src/scripter/transcript.ts` — YouTube transcript extraction with 4 fallbacks (Innertube, youtube-transcript package, Gemini native, yt-dlp+Whisper). IG/Twitter now routes to yt-dlp+Whisper instead of throwing.
- `src/scripter/generate.ts` — Script generator via Claude Sonnet on OpenRouter. Outputs HOOK/BODY/CTA + b-roll suggestions.
- `src/pipeline/generateAudio.ts` — ElevenLabs TTS with character-level alignment → word timestamps. Falls back to mock silence if no key.
- `src/pipeline/render.ts` — Full Remotion render pipeline, outputs h264 MP4.
- `src/pipeline/resolveAssets.ts` — STUB. Returns slots unchanged. Does nothing.
- `src/components/BRoll.tsx` — Renders placeholder card OR `<Video>` if slot.asset is set. Logic is there, just no assets ever get resolved.
- `src/components/Sidebar.tsx` — PARTIALLY UPDATED. Has picks prop and ESPN headshot logic but may have issues. Verify it compiles and works.
- `src/components/BottomBar.tsx` — PARTIALLY UPDATED. YouTube Shorts gradient style. Verify it compiles and looks right.
- `src/components/Captions.tsx` — Word-by-word captions synced to ElevenLabs timestamps. Needs minor position/animation tuning.
- `src/types.ts` — Has PickTimeline type added. VideoInput has optional picks array.
- `src/compositions/SportsVideo.tsx` — Main composition. Currently passes `<Sidebar />` without picks prop — needs updating.
- `src/server.ts` — Full Express server with /render, /render-from-script, /api/generate endpoints.
- `public/index.html` — Dashboard UI
- `public/scripter.html` — Script generation UI

---

## YOUR JOB — Everything To Build Tonight

Work through these tasks in order. After each task, run `npx tsc --noEmit` to confirm clean compile before moving on. Commit after each completed task with a descriptive message.

---

### TASK 1 — Verify and fix Sidebar + BottomBar compile

Read `src/components/Sidebar.tsx`, `src/components/BottomBar.tsx`, `src/compositions/SportsVideo.tsx`, and `src/types.ts`.

Check:
- Does `SportsVideo.tsx` pass `input.picks` to `<Sidebar>`? If not, update it: `<Sidebar picks={input.picks} totalSegments={input.script.length} />`
- Does Sidebar compile cleanly with the picks prop?
- Does BottomBar look right (gradient, Subscribe pill, title/date layout)?

Fix any TypeScript errors. Run `npx tsc --noEmit`. Commit: `fix: verify sidebar + bottombar compile clean`

---

### TASK 2 — Captions polish

Read `src/components/Captions.tsx`.

Make these changes:
1. Move caption position from wherever it currently is to `bottom: 25%` (from bottom of frame)
2. Add a spring bounce when each word changes — use Remotion's `spring()` function to scale from 0.85 to 1.0 when a new word appears. Each new word should pop in with a quick spring (damping: 15, stiffness: 300).
3. Keep everything else the same (Anton font, green color, stroke).

Run `npx tsc --noEmit`. Commit: `feat: captions spring bounce + position tuning`

---

### TASK 3 — Real b-roll asset resolution

Read `src/pipeline/resolveAssets.ts` and `src/types.ts`.

Replace the stub with a real implementation:

```typescript
import fs from "fs";
import path from "path";
import type { BRollSlot } from "../types";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function resolveAssets(broll: BRollSlot[]): Promise<BRollSlot[]> {
  const brollDir = path.join(process.cwd(), "broll");

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
      return { ...slot, asset: `../broll/${match}` };
    }

    return slot;
  });
}
```

Also create an empty `broll/.gitkeep` file and add `broll/*.mp4` to `.gitignore` so clip files don't get committed.

Run `npx tsc --noEmit`. Commit: `feat: real b-roll asset resolution from broll/ folder`

---

### TASK 4 — scripterConnector picks extraction

Read `src/scripterConnector.ts` and `src/types.ts`.

The `scripterOutputToVideoInput()` function currently ignores the `players` array when building b-roll slots and never populates `picks`. Fix this:

1. Build the `picks` array from `output.players` using ESPN headshot URLs:
```typescript
const picks: PickTimeline[] = (output.players || []).map((playerName, i) => ({
  playerName,
  team: "",
  headshotUrl: null, // ESPN lookup not available here, leave null for initials fallback
  line: "",
  segmentIndex: i,
}));
```

2. Include `picks` in the returned `VideoInput` object.

3. Make b-roll slots smarter — cycle through players properly so each player gets their own dedicated slot, not just cycling by index.

Run `npx tsc --noEmit`. Commit: `feat: picks array populated from players in scripterConnector`

---

### TASK 5 — ESPN headshot lookup utility

Create a new file `src/utils/espnHeadshot.ts`:

```typescript
// ESPN headshot URL patterns by sport
// Usage: getEspnHeadshotUrl("Donovan Mitchell", "nba") -> URL or null

const NBA_ID_MAP: Record<string, number> = {
  // Add known players as needed — this is a starter set
  "donovan mitchell": 3136193,
  "lebron james": 1966,
  "stephen curry": 3975,
  "giannis antetokounmpo": 3032977,
  "nikola jokic": 3112335,
  "kevin durant": 3202,
  "joel embiid": 3059318,
  "jayson tatum": 4065648,
  "luka doncic": 3945274,
  "anthony edwards": 4594268,
  "devin booker": 3136195,
  "damian lillard": 6606,
  "trae young": 4277905,
  "zion williamson": 4395628,
  "ja morant": 4279888,
};

export function getEspnHeadshotUrl(
  playerName: string,
  sport: "nba" | "nfl" | "mlb" = "nba"
): string | null {
  const key = playerName.toLowerCase().trim();
  const id = NBA_ID_MAP[key];
  if (!id) return null;

  const sportMap = { nba: "nba", nfl: "nfl", mlb: "mlb" };
  return `https://a.espncdn.com/i/headshots/${sportMap[sport]}/players/full/${id}.png`;
}
```

Then update `scripterConnector.ts` to use it:
```typescript
import { getEspnHeadshotUrl } from "./utils/espnHeadshot";

// In picks mapping:
headshotUrl: getEspnHeadshotUrl(playerName, "nba"),
```

Run `npx tsc --noEmit`. Commit: `feat: ESPN headshot lookup utility`

---

### TASK 6 — Add /api/transcribe endpoint

Read `src/server.ts`.

Add a standalone transcription endpoint so the scripter UI can transcribe any URL without generating a script:

```typescript
app.post("/api/transcribe", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "Missing url" });
    return;
  }

  console.log(`\n[${new Date().toISOString()}] POST /api/transcribe -- ${url}`);

  try {
    const result = await extractTranscript(url);
    res.json({
      transcript: result.text,
      platform: result.platform,
      videoTitle: result.videoTitle,
      channel: result.channel,
      videoId: result.videoId,
      method: result.method,
      charCount: result.text.length,
    });
  } catch (err: any) {
    console.error("  Transcription failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});
```

Add it to the config endpoint's endpoints list too.

Run `npx tsc --noEmit`. Commit: `feat: standalone /api/transcribe endpoint`

---

### TASK 7 — Improve error handling in render pipeline

Read `src/pipeline/render.ts` and `src/pipeline/generateAudio.ts`.

The current pipeline has no timeout protection and will hang forever if ElevenLabs or Remotion stalls. Add:

1. A 30-second timeout wrapper around the ElevenLabs API call in `generateAudio.ts` (use axios `timeout: 30000` — it's already using axios so just add the config).

2. In `render.ts`, wrap the entire `renderMedia` call in a Promise.race with a 5-minute timeout:
```typescript
const RENDER_TIMEOUT_MS = 5 * 60 * 1000;

await Promise.race([
  renderMedia({ ... }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Render timed out after 5 minutes")), RENDER_TIMEOUT_MS)
  ),
]);
```

3. Add cleanup: after a successful render, delete the audio file from `public/assets/audio.mp3` so it doesn't persist between renders (each render generates a fresh one).

Run `npx tsc --noEmit`. Commit: `fix: render pipeline timeouts + audio cleanup`

---

### TASK 8 — Dashboard UI improvements

Read `public/index.html`.

Add to the dashboard:
1. A "Test Transcription" section with a URL input and a button that calls `/api/transcribe` and shows the transcript text + platform/method info in a result box. This is for testing IG Reels and YT Shorts transcription without going all the way to render.

2. Show the detected platform (YouTube / Instagram / Twitter) as a colored badge next to the URL input when a result comes back.

3. In the render history list, show the render duration in seconds next to each entry.

This is HTML/JS in the existing file — keep the same dark green aesthetic that's already there. No new dependencies.

Commit: `feat: dashboard transcription tester + render duration display`

---

### TASK 9 — Final integration test + README update

1. Run `npx tsc --noEmit` one final time to confirm everything compiles clean.

2. Run `npm run dev` and verify the server starts without errors.

3. Update `README.md` (create it if it doesn't exist) with:
   - What this project does (1 paragraph)
   - Setup instructions (clone, npm install, brew install yt-dlp ffmpeg, copy .env.example)
   - All environment variables and where to get them
   - API endpoint reference (all routes)
   - The broll/ folder convention for asset matching
   - How to trigger a render via curl

Commit: `docs: README + final integration check`

---

## ENV VARIABLES REFERENCE

```
OPENROUTER_API_KEY    — openrouter.ai — for Claude Sonnet script generation
ELEVENLABS_API_KEY    — elevenlabs.io — for TTS audio + word timestamps
ELEVENLABS_VOICE_ID   — default: pNInz6obpgDQGcFmaJgB
GOOGLE_AI_KEY         — aistudio.google.com — Gemini native video transcription fallback
OPENAI_API_KEY        — platform.openai.com — Whisper transcription for IG/Shorts
```

---

## IMPORTANT RULES

- Run `npx tsc --noEmit` after every task. Do not proceed if there are TypeScript errors.
- Commit after every completed task with the message specified.
- Do not modify `src/pipeline/render.ts` Remotion bundling logic beyond what Task 7 specifies.
- Do not add new npm dependencies unless absolutely necessary. Everything needed is already installed.
- The `broll/` folder convention: filenames should be slugified player names or labels. E.g. `donovan-mitchell.mp4`, `cavs-highlights.mp4`. The resolveAssets function matches by slugified substring.
- Keep all existing API endpoints working — this is deployed on Railway and the scripter frontend at novig-scripter.vercel.app depends on it.
- Push to master when all tasks are done: `git push origin master`
