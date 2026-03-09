import { YoutubeTranscript } from "youtube-transcript";
import axios from "axios";
import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";

type TranscriptResult = {
  text: string;
  method: string;
  videoId: string;
  videoTitle: string;
  channel: string;
  platform: "youtube" | "instagram" | "twitter" | "manual";
};

function extractVideoId(url: string): string | null {
  // YouTube
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of ytPatterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function detectPlatform(url: string): "youtube" | "instagram" | "twitter" | "manual" {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram\.com|instagr\.am/i.test(url)) return "instagram";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  return "manual";
}

// XML Caption Parser — handles both manual <text> and ASR <p><s> formats
function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n/g, " ");
}

function parseCaptionXml(xml: string): string | null {
  // Format 1: Manual captions — <text>words</text>
  const textMatches = [...xml.matchAll(/<text[^>]*>(.*?)<\/text>/gs)];
  if (textMatches.length > 0) {
    const t = textMatches.map((m) => decodeEntities(m[1])).join(" ").trim();
    if (t.length > 10) return t;
  }
  // Format 2: ASR captions — <p><s>word</s></p>
  const pMatches = [...xml.matchAll(/<p [^>]*>([\s\S]*?)<\/p>/gs)];
  if (pMatches.length > 0) {
    const words: string[] = [];
    for (const pm of pMatches) {
      const sMatches = [...pm[1].matchAll(/<s[^>]*>(.*?)<\/s>/gs)];
      for (const sm of sMatches) {
        const w = decodeEntities(sm[1]).trim();
        if (w) words.push(w);
      }
    }
    const t = words.join(" ").trim();
    if (t.length > 10) return t;
  }
  return null;
}

// Method 0: Innertube ANDROID client (best for Shorts + auto-captions)
async function tryInnertubeAndroid(videoId: string): Promise<string | null> {
  console.log(`[Transcript] Method: InnertubeAndroid — attempting for videoId=${videoId}`);
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        context: {
          client: { clientName: "ANDROID", clientVersion: "19.09.37", hl: "en", gl: "US", androidSdkVersion: 30 },
        },
      }),
    });
    if (!res.ok) {
      console.log(`[Transcript] Method: InnertubeAndroid — Result: failed — Reason: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) {
      console.log(`[Transcript] Method: InnertubeAndroid — Result: failed — Reason: no caption tracks found`);
      return null;
    }
    const track = tracks.find((t: any) => t.languageCode === "en") || tracks[0];
    const capRes = await fetch(track.baseUrl);
    const xml = await capRes.text();
    if (!xml || xml.length < 50) {
      console.log(`[Transcript] Method: InnertubeAndroid — Result: failed — Reason: caption XML too short`);
      return null;
    }
    const text = parseCaptionXml(xml);
    if (text) {
      console.log(`[Transcript] Method: InnertubeAndroid — Result: success — Reason: ${text.length} chars extracted`);
    } else {
      console.log(`[Transcript] Method: InnertubeAndroid — Result: failed — Reason: could not parse caption XML`);
    }
    return text;
  } catch (err: any) {
    console.log(`[Transcript] Method: InnertubeAndroid — Result: failed — Reason: ${err.message}`);
    return null;
  }
}

// Method 1: youtube-transcript package (captions)
async function tryYoutubeTranscript(videoId: string): Promise<string | null> {
  console.log(`[Transcript] Method: YoutubeTranscript — attempting for videoId=${videoId}`);
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (!items || items.length === 0) {
      console.log(`[Transcript] Method: YoutubeTranscript — Result: failed — Reason: no transcript items returned`);
      return null;
    }
    const text = items.map((i: any) => i.text).join(" ").trim();
    if (text.length < 10) {
      console.log(`[Transcript] Method: YoutubeTranscript — Result: failed — Reason: transcript too short (${text.length} chars)`);
      return null;
    }
    console.log(`[Transcript] Method: YoutubeTranscript — Result: success — Reason: ${text.length} chars extracted`);
    return text;
  } catch (err: any) {
    console.log(`[Transcript] Method: YoutubeTranscript — Result: failed — Reason: ${err.message}`);
    return null;
  }
}

// Method 2: Google Gemini native API (processes actual video)
async function tryGeminiNative(videoId: string): Promise<string | null> {
  const key = process.env.GOOGLE_AI_KEY;
  if (!key) {
    console.log(`[Transcript] Method: GeminiNative — Result: failed — Reason: GOOGLE_AI_KEY not set`);
    return null;
  }

  console.log(`[Transcript] Method: GeminiNative — attempting for videoId=${videoId}`);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const resp = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: "Transcribe the spoken words in this video verbatim in English. Output ONLY the transcript text, nothing else.",
              },
              {
                fileData: {
                  mimeType: "video/*",
                  fileUri: `https://www.youtube.com/watch?v=${videoId}`,
                },
              },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 4000 },
      },
      { timeout: 30000 }
    );

    const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text || text.length < 10) {
      console.log(`[Transcript] Method: GeminiNative — Result: failed — Reason: empty or too-short response`);
      return null;
    }
    console.log(`[Transcript] Method: GeminiNative — Result: success — Reason: ${text.length} chars extracted`);
    return text;
  } catch (err: any) {
    console.log(`[Transcript] Method: GeminiNative — Result: failed — Reason: ${err.message}`);
    return null;
  }
}

// Method 3: Try fetching YouTube oEmbed for title/channel
async function fetchYouTubeMeta(videoId: string): Promise<{ title: string; channel: string }> {
  try {
    const resp = await axios.get(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { timeout: 5000 }
    );
    return {
      title: resp.data.title || "Unknown",
      channel: resp.data.author_name || "Unknown",
    };
  } catch {
    return { title: "Unknown", channel: "Unknown" };
  }
}

// Method 4: yt-dlp + OpenAI Whisper (works for IG Reels, Twitter/X, YT Shorts)
async function tryYtDlpWhisper(url: string): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.log(`[Transcript] Method: YtDlpWhisper — Result: failed — Reason: OPENAI_API_KEY not set`);
    return null;
  }

  console.log(`[Transcript] Method: YtDlpWhisper — attempting for url=${url}`);

  const tmpDir = os.tmpdir();
  const baseName = `novig_audio_${Date.now()}`;
  const tmpFile = path.join(tmpDir, baseName);
  let audioPath: string | null = null;

  try {
    // Download audio only — works for YT Shorts, IG Reels, Twitter/X
    execSync(
      `yt-dlp --no-playlist -x --audio-format mp3 --audio-quality 3 -o "${tmpFile}.%(ext)s" "${url}"`,
      { stdio: "pipe", timeout: 60000 }
    );

    // Scan tmp dir for any file matching the base pattern (yt-dlp may use different extension)
    const files = fs.readdirSync(tmpDir);
    const matched = files.find((f) => f.startsWith(baseName));
    if (matched) {
      audioPath = path.join(tmpDir, matched);
      console.log(`[Transcript] Method: YtDlpWhisper — yt-dlp produced file: ${matched}`);
    } else {
      console.log(`[Transcript] Method: YtDlpWhisper — Result: failed — Reason: yt-dlp produced no audio file in ${tmpDir}`);
      return null;
    }

    // Send to Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([fs.readFileSync(audioPath)], { type: "audio/mpeg" });
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");
    formData.append("language", "en");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      console.log(`[Transcript] Method: YtDlpWhisper — Result: failed — Reason: Whisper API returned HTTP ${whisperRes.status}`);
      return null;
    }

    const text = (await whisperRes.text()).trim();
    if (text.length < 10) {
      console.log(`[Transcript] Method: YtDlpWhisper — Result: failed — Reason: Whisper returned too-short text (${text.length} chars)`);
      return null;
    }

    console.log(`[Transcript] Method: YtDlpWhisper — Result: success — Reason: ${text.length} chars extracted`);
    return text;
  } catch (err: any) {
    console.log(`[Transcript] Method: YtDlpWhisper — Result: failed — Reason: ${err.message}`);
    return null;
  } finally {
    // Cleanup temp file
    if (audioPath) {
      try { fs.unlinkSync(audioPath); } catch {}
    }
  }
}

export async function extractTranscript(
  url?: string,
  manualTranscript?: string
): Promise<TranscriptResult> {
  // Manual transcript fallback
  if (manualTranscript && manualTranscript.trim().length > 10) {
    const platform = url ? detectPlatform(url) : "manual";
    const videoId = url ? extractVideoId(url) || "" : "";
    let meta = { title: "Manual Input", channel: "" };
    if (videoId) meta = await fetchYouTubeMeta(videoId);
    return {
      text: manualTranscript.trim(),
      method: "manual",
      videoId,
      videoTitle: meta.title,
      channel: meta.channel,
      platform,
    };
  }

  if (!url) {
    throw new Error("No URL or manual transcript provided");
  }

  const platform = detectPlatform(url);
  const videoId = extractVideoId(url) || "";

  if (platform !== "youtube") {
    // For IG, Twitter, or unknown — route straight to yt-dlp + Whisper
    console.log(`[Transcript] Platform: ${platform} — routing directly to YtDlpWhisper`);
    const meta = { title: url, channel: platform };

    const text = await tryYtDlpWhisper(url);
    if (!text) {
      throw new Error(
        `Could not transcribe ${platform} video. Make sure yt-dlp is installed (brew install yt-dlp) and OPENAI_API_KEY is set. You can also paste the transcript manually.`
      );
    }

    return {
      text,
      method: "whisper",
      videoId: "",
      videoTitle: meta.title,
      channel: meta.channel,
      platform,
    };
  }

  if (!videoId) {
    throw new Error("Could not extract YouTube video ID from URL");
  }

  const isShorts = /\/shorts\//i.test(url);
  const meta = await fetchYouTubeMeta(videoId);

  let text: string | null = null;

  if (isShorts) {
    // Shorts: try Whisper first (captions almost never available), then fall back to caption methods
    console.log(`[Transcript] Detected YouTube Shorts URL — running YtDlpWhisper first`);
    text = await tryYtDlpWhisper(url);
    if (!text) text = await tryInnertubeAndroid(videoId);
    if (!text) text = await tryYoutubeTranscript(videoId);
    if (!text) text = await tryGeminiNative(videoId);
  } else {
    // Regular YouTube: try caption methods first, Whisper as final fallback
    console.log(`[Transcript] Detected regular YouTube URL — trying caption methods first`);
    text = await tryInnertubeAndroid(videoId);
    if (!text) text = await tryYoutubeTranscript(videoId);
    if (!text) text = await tryGeminiNative(videoId);
    if (!text) text = await tryYtDlpWhisper(url);
  }

  if (!text) {
    throw new Error(
      "Could not extract transcript. YouTube may be blocking requests. Please paste the transcript manually."
    );
  }

  return {
    text,
    method: text ? "captions" : "gemini",
    videoId,
    videoTitle: meta.title,
    channel: meta.channel,
    platform,
  };
}
