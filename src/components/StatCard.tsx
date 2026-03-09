import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";
import type { StatMoment } from "../types";

const { fontFamily } = loadFont();

const ENTER_FRAMES = 8;
const EXIT_FRAMES = 6;

type StatCardProps = {
  moment: StatMoment;
  /** Total display duration in frames (endFrame - startFrame) */
  durationFrames: number;
};

export const StatCard: React.FC<StatCardProps> = ({ moment, durationFrames }) => {
  const frame = useCurrentFrame();

  // Entrance: slide up + fade in over ENTER_FRAMES
  const enterProgress = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit: fade out over EXIT_FRAMES before the sequence ends
  const exitStart = durationFrames - EXIT_FRAMES;
  const exitProgress = interpolate(frame, [exitStart, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = enterProgress * (1 - exitProgress);
  const translateY = interpolate(enterProgress, [0, 1], [40, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "35%",
        left: "50%",
        transform: `translateX(-50%) translateY(${translateY}px)`,
        opacity,
        width: 820,
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(10, 10, 10, 0.92)",
          borderRadius: 20,
          borderLeft: "6px solid #00FF00",
          padding: "32px 40px",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 40px rgba(0,0,0,0.7), 0 0 20px rgba(0,255,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Top row: player name + novig logo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 22,
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {moment.playerName}
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "#00FF00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily,
                fontSize: 22,
                color: "#000",
                lineHeight: 1,
              }}
            >
              N
            </span>
          </div>
        </div>

        {/* Large stat number */}
        <span
          style={{
            fontFamily,
            fontSize: 120,
            color: "#00FF00",
            lineHeight: 1,
            textShadow: "0 0 30px rgba(0,255,0,0.4)",
          }}
        >
          {moment.statNumber}
        </span>

        {/* Label */}
        <span
          style={{
            fontFamily,
            fontSize: 32,
            color: "#ffffff",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {moment.label}
        </span>
      </div>
    </div>
  );
};
