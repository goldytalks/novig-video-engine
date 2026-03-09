import React from "react";
import { useCurrentFrame, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Anton";
import type { BRollSlot } from "../types";

const { fontFamily } = loadFont();

type BRollProps = {
  slots: BRollSlot[];
};

const PlaceholderCard: React.FC<{ slot: BRollSlot }> = ({ slot }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {/* Player/label name — clean and minimal */}
      <div
        style={{
          fontFamily,
          fontSize: 72,
          color: "rgba(255,255,255,0.85)",
          textAlign: "center",
          textTransform: "uppercase",
          padding: "0 80px",
          lineHeight: 1.15,
        }}
      >
        {slot.playerName ?? slot.label}
      </div>

      {/* Subtle green underline accent */}
      <div
        style={{
          width: 80,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#00FF00",
          opacity: 0.6,
        }}
      />
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
            volume={0}
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
