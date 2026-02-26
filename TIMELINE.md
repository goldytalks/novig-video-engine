# Novig Video Engine — Editing Timeline & Visual Spec

## Current Status (v0.1 — Proof of Concept)

Working end-to-end pipeline:
- ElevenLabs TTS with word-level timestamps ✅
- Remotion rendering to MP4 ✅
- Word-by-word captions (Anton font, green, stroke) ✅
- Sidebar with green line + dots ✅
- Bottom bar with handle/title ✅
- B-roll placeholder cards ✅

---

## What Needs to Change (v0.1 → v1.0)

### Sidebar — Major Rework Needed

**Current:** 3 static green dots that animate in on a fixed schedule. Purely decorative.

**Target (ElitePicks style):**
- Each dot = a **player headshot** inside a circular frame
- Number of dots = number of picks in the video (dynamic, not fixed at 3)
- Green ring border around each face circle (~4px, #00FF00)
- The dot for the **currently active pick** is highlighted (brighter glow, slightly larger scale)
- As the video progresses through picks, a **green fill/progress indicator** travels down the line between dots
- Dots that haven't been reached yet are slightly dimmed (opacity ~0.5)
- Dots that are complete stay fully lit
- **Face images**: use ESPN headshots (`https://a.espncdn.com/i/headshots/nba/players/full/{id}.png`) — need an ESPN ID lookup table or fallback to initials

**Data needed per pick:**
```typescript
type Pick = {
  playerName: string;
  headshotUrl: string | null;  // ESPN headshot or null for fallback
  startFrame: number;          // when this pick segment starts
  endFrame: number;            // when this pick segment ends
}
```

### Captions — Minor Tweaks

**Current:** Centered, green, one word at a time. Looks close.

**Target adjustments:**
- Position slightly lower (currently `bottom: 30%`, target more like `bottom: 25%`)
- The word should feel more "punchy" — slightly larger spring bounce
- Consider 2-3 word groups instead of single words for readability (configurable)

### Bottom Bar — Rework to Match Reference

**Current:** Simple dark bar with avatar + handle left, title + date right.

**Target (ElitePicks style):**
- Left: circular avatar + `@handle` + "Subscribe" pill button (static, not interactive)
- Below handle row: **title text** (bold, white) + **date** (regular, white) side by side
- The bar is taller (~100px) and the layout is more like YouTube Shorts native UI
- Semi-transparent black gradient fade (not a hard-edge bar)

### B-Roll — Phase 2 (Real Footage)

**Current:** Placeholder cards with label text.

**Target:**
- Full-bleed video clips behind all overlays
- Source: yt-dlp clipped segments from YouTube highlight reels
- Clip library keyed by player name
- When `asset` field is populated, renders `<Video>` component instead of placeholder
- Transition: hard cut between clips (no crossfade)

---

## Video Timeline Structure

A typical Novig picks video follows this structure:

```
[0:00 - 0:02]  INTRO
  - Title card or cold open
  - Sidebar animates in (line draws, dots appear)
  - Bottom bar fades in

[0:02 - 0:05]  PICK 1 — SETUP
  - B-roll: team/player highlights
  - Sidebar: dot 1 highlighted
  - Narration: "The Cavs are sweeping everyone..."
  - Captions: word-by-word sync

[0:05 - 0:08]  PICK 1 — THE LINE
  - B-roll: player-specific footage
  - Sidebar: dot 1 still active
  - Narration: "Take the Cavs minus four..."
  - Caption emphasis on the bet line

[0:08 - 0:10]  TRANSITION TO PICK 2
  - Sidebar: progress indicator moves to dot 2
  - B-roll cuts to next player/team
  - Brief pause or transition phrase

[0:10 - 0:13]  PICK 2 — FULL SEGMENT
  - Same structure as Pick 1
  - Sidebar: dot 2 highlighted

[repeat for N picks]

[LAST 1-2s]  OUTRO
  - All sidebar dots lit
  - "Follow for more" or handle callout
  - Bottom bar prominent
```

---

## Data Contract — Script Input Format

The pipeline takes a single JSON object. This is what the script generator should output:

```typescript
type VideoInput = {
  title: string;              // "NBA Wednesday Picks"
  date: string;               // "February 25"
  handle: string;             // "@novig"
  script: ScriptSegment[];    // narration segments
  picks: PickTimeline[];      // sidebar pick data (NEW)
  broll: BRollSlot[];         // b-roll clips/placeholders
}

type PickTimeline = {
  playerName: string;         // "Donovan Mitchell"
  team: string;               // "CLE"
  headshotUrl: string | null; // ESPN headshot URL
  line: string;               // "Cavs -4" — shown on screen?
  segmentIndex: number;       // which script segment this pick covers
}

type ScriptSegment = {
  text: string;               // full narration for this segment
  pickIndex: number;          // which pick this segment is about
}
```

Frames are calculated dynamically from audio timestamps — the pipeline handles this.

---

## Implementation Priority

### Phase 1 — Ship to coworker (NOW)
- [x] Working pipeline with ElevenLabs TTS
- [x] Basic sidebar, captions, bottom bar
- [x] Push to GitHub
- [ ] Accept imported script JSON (not hardcoded)

### Phase 2 — Visual Polish
- [ ] Sidebar: player face headshots in dots
- [ ] Sidebar: synced to timeline (active pick tracking)
- [ ] Sidebar: progress indicator between dots
- [ ] Bottom bar: YouTube Shorts style layout
- [ ] Captions: position/size tuning

### Phase 3 — Real B-Roll
- [ ] yt-dlp integration for clip downloading
- [ ] Clip library (player name → clip path)
- [ ] Auto-match script mentions to clips
- [ ] Trim/resize clips to 9:16

### Phase 4 — Script Generation Integration
- [ ] OpenRouter script generator outputs VideoInput JSON
- [ ] One-command: script → audio → video
- [ ] Batch rendering for multi-day picks
