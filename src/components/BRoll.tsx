import React from "react";
import { useCurrentFrame, interpolate, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Anton";
import type { BRollSlot } from "../types";

const { fontFamily } = loadFont();

type BRollProps = {
  slots: BRollSlot[];
};

const PlaceholderCard: React.FC<{ slot: BRollSlot }> = ({ slot }) => {
  const frame = useCurrentFrame();

  const pulseOpacity = interpolate(
    Math.sin((frame / 60) * Math.PI * 2),
    [-1, 1],
    [0.7, 1.0]
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Label text */}
      <div
        style={{
          fontFamily,
          fontSize: 80,
          color: "#00FF00",
          textAlign: "center",
          textTransform: "uppercase",
          padding: "0 60px",
          lineHeight: 1.1,
          opacity: pulseOpacity,
        }}
      >
        {slot.label} BROLL HERE
      </div>

      {/* Slot ID in bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          right: 32,
          fontFamily: "monospace",
          fontSize: 14,
          color: "rgba(255,255,255,0.35)",
        }}
      >
        {slot.id}
      </div>
    </div>
  );
};

export const BRoll: React.FC<BRollProps> = ({ slots }) => {
  const frame = useCurrentFrame();

  const activeSlot = slots.find(
    (slot) => frame >= slot.startFrame && frame < slot.endFrame
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#0a0a0a",
      }}
    >
      {activeSlot &&
        (activeSlot.asset ? (
          <Video
            src={staticFile(activeSlot.asset)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <PlaceholderCard slot={activeSlot} />
        ))}
    </div>
  );
};
