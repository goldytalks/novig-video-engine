import React from "react";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { BRoll } from "../components/BRoll";
import { Sidebar } from "../components/Sidebar";
import { Captions } from "../components/Captions";
import { BottomBar } from "../components/BottomBar";
import { Intro } from "../components/Intro";
import { Outro } from "../components/Outro";
import { StatCard } from "../components/StatCard";
import { TopBar } from "../components/TopBar";
import type { SportsVideoProps } from "../types";

export const SportsVideo: React.FC<SportsVideoProps> = ({
  input,
  words,
  audioSrc,
  introEndFrame,
  outroStartFrame,
  statMoments,
}) => {
  const { durationInFrames } = useVideoConfig();

  const INTRO_END = introEndFrame ?? 90;
  const OUTRO_START = outroStartFrame ?? durationInFrames - 120;
  const MAIN_DURATION = OUTRO_START - INTRO_END;

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: "#0a0a0a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── INTRO: 0 → INTRO_END ─────────────────────────────────────── */}
      <Sequence from={0} durationInFrames={INTRO_END}>
        <Intro />
      </Sequence>

      {/* ── MAIN CONTENT: INTRO_END → OUTRO_START ────────────────────── */}
      <Sequence from={INTRO_END} durationInFrames={MAIN_DURATION}>
        {/* Layer 1: B-Roll (full bleed, MUTED) */}
        <BRoll slots={input.broll} />

        {/* Layer 2: Sidebar (fixed left) */}
        <Sidebar picks={input.picks} totalSegments={input.script.length} />

        {/* Layer 3: Captions (synced to word timestamps) */}
        <Captions words={words} />

        {/* Layer 4: Stat cards */}
        {statMoments?.map((sm, i) => {
          const dur = sm.endFrame - sm.startFrame;
          return (
            <Sequence key={i} from={sm.startFrame} durationInFrames={dur}>
              <StatCard moment={sm} durationFrames={dur} />
            </Sequence>
          );
        })}

        {/* Ding sound per stat card */}
        {statMoments?.map((sm, i) => (
          <Sequence key={`ding-${i}`} from={sm.startFrame}>
            <Audio src={staticFile("sounds/ding.mp3")} volume={1} />
          </Sequence>
        ))}

        {/* Layer 5: Top CTA bar */}
        <TopBar />

        {/* Layer 6: Bottom Bar */}
        <BottomBar
          handle={input.handle}
          title={input.title}
          date={input.date}
        />

        {/* Voiceover audio */}
        {audioSrc && <Audio src={staticFile(audioSrc)} />}
      </Sequence>

      {/* ── OUTRO: OUTRO_START → end ─────────────────────────────────── */}
      <Sequence from={OUTRO_START} durationInFrames={durationInFrames - OUTRO_START}>
        <Outro />
      </Sequence>
    </div>
  );
};
