import axios from "axios";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import type { WordTimestamp } from "../types";

type AudioResult = {
  audioPath: string;
  timestamps: WordTimestamp[];
};

function generateMockAudio(script: string): AudioResult {
  console.log("  [Audio] Using mock audio (no valid ElevenLabs key)");

  const audioPath = path.join(process.cwd(), "public", "assets", "audio.mp3");

  // Generate 15 seconds of silence using ffmpeg
  try {
    const ffmpegPath = (() => {
      try {
        return require("ffmpeg-static") as string;
      } catch {
        return "ffmpeg";
      }
    })();
    execSync(
      `${ffmpegPath} -y -f lavfi -i anullsrc=r=44100:cl=mono -t 15 -q:a 9 "${audioPath}"`,
      { stdio: "pipe" }
    );
    console.log("  [Audio] Generated 15s silent audio");
  } catch (err) {
    // If ffmpeg fails, write a minimal valid mp3
    console.log("  [Audio] ffmpeg not available, writing minimal mp3");
    const minimalMp3 = Buffer.from(
      "//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVV",
      "base64"
    );
    fs.writeFileSync(audioPath, minimalMp3);
  }

  // Generate fake word timestamps by splitting script and spacing evenly
  const words = script.split(/\s+/).filter(Boolean);
  const totalDuration = 15;
  const wordDuration = totalDuration / words.length;

  const timestamps: WordTimestamp[] = words.map((word, i) => ({
    word,
    start: i * wordDuration,
    end: (i + 1) * wordDuration,
  }));

  console.log(`  [Audio] Generated ${timestamps.length} word timestamps (mock)`);

  return { audioPath: "assets/audio.mp3", timestamps };
}

function characterAlignmentToWords(
  characters: string[],
  characterStartTimes: number[],
  characterEndTimes: number[]
): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  let currentWord = "";
  let wordStart = -1;
  let wordEnd = -1;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    if (char === " " || char === "\n") {
      if (currentWord.length > 0) {
        words.push({ word: currentWord, start: wordStart, end: wordEnd });
        currentWord = "";
        wordStart = -1;
        wordEnd = -1;
      }
    } else {
      if (wordStart === -1) {
        wordStart = characterStartTimes[i];
      }
      wordEnd = characterEndTimes[i];
      currentWord += char;
    }
  }

  if (currentWord.length > 0) {
    words.push({ word: currentWord, start: wordStart, end: wordEnd });
  }

  return words;
}

export async function generateAudio(script: string): Promise<AudioResult> {
  console.log("  [Audio] Starting audio generation...");

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || apiKey.startsWith("placeholder") || apiKey.length < 10) {
    return generateMockAudio(script);
  }

  const audioPath = path.join(process.cwd(), "public", "assets", "audio.mp3");

  try {
    console.log("  [Audio] Calling ElevenLabs API...");
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    // Extract audio
    const audioBase64 = data.audio_base64;
    const audioBuffer = Buffer.from(audioBase64, "base64");
    fs.writeFileSync(audioPath, audioBuffer);
    console.log(`  [Audio] Saved audio (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

    // Extract word-level timestamps from character alignment
    const alignment = data.alignment;
    const timestamps = characterAlignmentToWords(
      alignment.characters,
      alignment.character_start_times_seconds,
      alignment.character_end_times_seconds
    );

    console.log(`  [Audio] Extracted ${timestamps.length} word timestamps`);

    return { audioPath: "assets/audio.mp3", timestamps };
  } catch (err: any) {
    console.log(`  [Audio] ElevenLabs API failed: ${err.message}`);
    console.log("  [Audio] Falling back to mock audio");
    return generateMockAudio(script);
  }
}
