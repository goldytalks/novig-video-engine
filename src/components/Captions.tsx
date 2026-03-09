import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import type { WordTimestamp } from "../types";

const { fontFamily } = loadFont();

type CaptionsProps = {
  words: WordTimestamp[];
};

export const Captions: React.FC<CaptionsProps> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Find the active word
  const activeIndex = useMemo(() => {
    return words.findIndex(
      (w) => currentTime >= w.start && currentTime < w.end
    );
  }, [words, currentTime]);

  if (activeIndex === -1) return null;

  const activeWord = words[activeIndex];

  // Calculate the frame when this word started
  const wordStartFrame = Math.floor(activeWord.start * fps);
  const framesSinceWordStart = frame - wordStartFrame;

  // Pop-in spring bounce animation
  const scale = spring({
    frame: framesSinceWordStart,
    fps,
    config: { damping: 15, stiffness: 300 },
  });

  const finalScale = 0.85 + scale * 0.15; // 0.85 → 1.0

  return (
    <div
      style={{
        position: "absolute",
        bottom: "25%",
        left: 0,
        right: 0,
        textAlign: "center",
        zIndex: 20,
      }}
    >
      <span
        style={{
          fontFamily,
          fontSize: 130,
          color: "#00FF00",
          textTransform: "uppercase",
          WebkitTextStroke: "8px black",
          textShadow: "4px 4px 0px black",
          display: "inline-block",
          transform: `scale(${finalScale})`,
          paintOrder: "stroke fill",
        }}
      >
        {activeWord.word}
      </span>
    </div>
  );
};
