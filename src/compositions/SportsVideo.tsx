import React from "react";
import { useCurrentFrame, useVideoConfig, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { BRoll } from "../components/BRoll";
import { Sidebar } from "../components/Sidebar";
import { Captions } from "../components/Captions";
import { BottomBar } from "../components/BottomBar";
import type { SportsVideoProps } from "../types";

export const SportsVideo: React.FC<SportsVideoProps> = ({
  input,
  words,
  audioSrc,
}) => {
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
      {/* Layer 1: B-Roll (full bleed) */}
      <BRoll slots={input.broll} />

      {/* Layer 2: Sidebar (fixed left) */}
      <Sidebar />

      {/* Layer 3: Captions (synced to timestamps) */}
      <Captions words={words} />

      {/* Layer 4: Bottom Bar (fixed bottom) */}
      <BottomBar
        handle={input.handle}
        title={input.title}
        date={input.date}
      />

      {/* Audio */}
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
    </div>
  );
};
