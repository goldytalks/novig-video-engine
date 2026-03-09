import type { WordTimestamp, StatMoment } from "../types";

const FPS = 30;
const CARD_DISPLAY_FRAMES = 75; // 2.5 seconds

type StatPattern = {
  regex: RegExp;
  getNumber: (match: RegExpMatchArray) => string;
  label: string;
};

const PATTERNS: StatPattern[] = [
  {
    regex: /averaging\s+(\d+(?:\.\d+)?)/i,
    getNumber: (m) => m[1],
    label: "PPG This Season",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s+points?\b/i,
    getNumber: (m) => m[1],
    label: "Points",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s+rebounds?\b/i,
    getNumber: (m) => m[1],
    label: "Rebounds",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s+assists?\b/i,
    getNumber: (m) => m[1],
    label: "Assists",
  },
  {
    regex: /(\d+)-(\d+)\s+record/i,
    getNumber: (m) => `${m[1]}-${m[2]}`,
    label: "Record",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s+(?:ppg|points per game)/i,
    getNumber: (m) => m[1],
    label: "PPG",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s+(?:rpg|rebounds per game)/i,
    getNumber: (m) => m[1],
    label: "RPG",
  },
  {
    regex: /(\d+(?:\.\d+)?)\s+(?:apg|assists per game)/i,
    getNumber: (m) => m[1],
    label: "APG",
  },
];

/**
 * Scans word timestamps for stat patterns and returns StatMoment objects
 * to be passed as props to SportsVideo.
 *
 * @param words       - Word timestamps (relative to audio start, in seconds)
 * @param playerName  - Default player name to attribute stats to
 */
export function detectStatMoments(
  words: WordTimestamp[],
  playerName: string = "Player"
): StatMoment[] {
  if (!words.length) return [];

  const fullText = words.map((w) => w.word).join(" ");
  const moments: StatMoment[] = [];
  const usedRanges: Array<{ start: number; end: number }> = [];

  for (const pattern of PATTERNS) {
    const match = pattern.regex.exec(fullText);
    if (!match) continue;

    // Walk words to find the word containing the match start
    let charCount = 0;
    let wordIndex = 0;
    for (let i = 0; i < words.length; i++) {
      if (charCount >= match.index) {
        wordIndex = i;
        break;
      }
      charCount += words[i].word.length + 1; // +1 for space
    }

    const matchWord = words[wordIndex];
    if (!matchWord) continue;

    const startFrame = Math.floor(matchWord.start * FPS);
    const endFrame = startFrame + CARD_DISPLAY_FRAMES;

    // Skip if this overlaps an existing card
    const overlaps = usedRanges.some(
      (r) => startFrame < r.end && endFrame > r.start
    );
    if (overlaps) continue;

    usedRanges.push({ start: startFrame, end: endFrame });
    moments.push({
      startFrame,
      endFrame,
      statNumber: pattern.getNumber(match),
      label: pattern.label,
      playerName,
    });
  }

  return moments.sort((a, b) => a.startFrame - b.startFrame);
}
