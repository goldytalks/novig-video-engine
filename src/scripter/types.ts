export type ScripterSettings = {
  targetSeconds: number; // 30 | 45 | 60 | 90
  style: "hype" | "analytical" | "casual";
  includeGraphics: boolean;
  includeStats: boolean;
  customHook?: string;
};

export type ScripterRequest = {
  url?: string;
  manualTranscript?: string;
  settings: ScripterSettings;
};

export type ScriptSections = {
  hook: string;
  body: string;
  cta: string;
};

export type TimelineClip = {
  id: string;
  section: string;
  label: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  text: string;
  wordCount: number;
  footage: string;
  overlays: string[];
};

export type EditingTimeline = {
  fps: 30;
  totalDurationSec: number;
  totalFrames: number;
  clips: TimelineClip[];
};

export type ScripterResult = {
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
  videoTitle: string;
  channel: string;
  videoId: string;
  platform: "youtube" | "instagram" | "twitter" | "manual";
  transcript: string;
};
