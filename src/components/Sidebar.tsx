import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img } from "remotion";
import type { PickTimeline } from "../types";

type SidebarProps = {
  picks?: PickTimeline[];
  totalSegments?: number;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const Sidebar: React.FC<SidebarProps> = ({ picks, totalSegments }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fallback: if no picks provided, render 3 static dots (legacy behavior)
  const hasPicks = picks && picks.length > 0;
  const count = hasPicks ? picks.length : 3;
  const segments = totalSegments || count;

  // Line draws from top to bottom over 30 frames
  const lineProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineHeight = 60; // percent of container
  const lineTop = 20; // percent from top

  // Determine which pick is active based on frame position
  // Each pick gets an equal slice of the total duration
  const framesPerSegment = durationInFrames / segments;
  const activeIndex = hasPicks
    ? Math.min(
        picks.length - 1,
        Math.floor(frame / framesPerSegment)
      )
    : -1;

  // Progress indicator: how far through the full pick sequence
  const overallProgress = interpolate(
    frame,
    [0, durationInFrames - 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Dot positions evenly spaced
  const dotPositions = Array.from({ length: count }, (_, i) =>
    count === 1 ? 0.5 : i / (count - 1)
  );

  // Progress fill height (from first dot to current position between dots)
  const progressFillEnd = overallProgress * 100;

  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        top: `${lineTop}%`,
        height: `${lineHeight}%`,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 56,
      }}
    >
      {/* Background line (dim) */}
      <div
        style={{
          position: "absolute",
          width: 2,
          height: `${lineProgress * 100}%`,
          background: "rgba(0,255,0,0.2)",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Progress fill line (bright green, travels down) */}
      {hasPicks && (
        <div
          style={{
            position: "absolute",
            width: 2,
            height: `${Math.min(progressFillEnd, lineProgress * 100)}%`,
            background: "#00FF00",
            boxShadow: "0 0 6px #00FF00",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      )}

      {/* Non-picks fallback: single bright line */}
      {!hasPicks && (
        <div
          style={{
            position: "absolute",
            width: 2,
            height: `${lineProgress * 100}%`,
            background: "#00FF00",
            boxShadow: "0 0 6px #00FF00",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      )}

      {/* Dots */}
      {dotPositions.map((position, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        const isFuture = i > activeIndex;

        const dotSpring = spring({
          frame: frame - i * 12,
          fps,
          config: { damping: 12, stiffness: 200 },
        });

        const scale = isActive ? 1.15 : 1.0;
        const opacity = hasPicks
          ? isFuture
            ? 0.5
            : 1.0
          : dotSpring > 0.01
            ? 1.0
            : 0;

        const pick = hasPicks ? picks[i] : null;
        const dotSize = 48;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${position * 100}%`,
              left: "50%",
              transform: `translate(-50%, -50%) scale(${dotSpring * scale})`,
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              opacity,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Green ring border */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid #00FF00",
                boxShadow: isActive
                  ? "0 0 12px #00FF00, 0 0 24px rgba(0,255,0,0.4)"
                  : "none",
              }}
            />

            {/* Inner content: headshot or initials */}
            {pick?.headshotUrl ? (
              <Img
                src={pick.headshotUrl}
                style={{
                  width: dotSize - 6,
                  height: dotSize - 6,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: dotSize - 6,
                  height: dotSize - 6,
                  borderRadius: "50%",
                  backgroundColor: pick ? "#1a1a2e" : "#00FF00",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "sans-serif",
                  fontWeight: 700,
                  fontSize: pick ? 16 : 0,
                  color: "#ffffff",
                }}
              >
                {pick ? getInitials(pick.playerName) : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
