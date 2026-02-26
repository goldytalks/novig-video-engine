import React from "react";
import { useCurrentFrame, interpolate, Video, staticFile } from "remotion";
import type { BRollSlot } from "../types";

type BRollProps = {
  slots: BRollSlot[];
};

const PlaceholderCard: React.FC<{ slot: BRollSlot }> = ({ slot }) => {
  const frame = useCurrentFrame();

  const gradientPosition = interpolate(frame % 120, [0, 60, 120], [0, 100, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#111",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Animated gradient overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `linear-gradient(${gradientPosition * 3.6}deg, rgba(0,255,0,0.03) 0%, rgba(0,255,0,0.08) 50%, rgba(0,255,0,0.03) 100%)`,
        }}
      />

      {/* Label text */}
      <div
        style={{
          fontFamily: "Anton, sans-serif",
          fontSize: 90,
          color: "#00FF00",
          textAlign: "center",
          textTransform: "uppercase",
          zIndex: 1,
          padding: "0 40px",
          lineHeight: 1.1,
        }}
      >
        {slot.label}
      </div>

      {slot.playerName && (
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            color: "rgba(255,255,255,0.4)",
            marginTop: 16,
            zIndex: 1,
          }}
        >
          {slot.playerName}
        </div>
      )}

      {/* Corner tag */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          fontFamily: "monospace",
          fontSize: 14,
          color: "rgba(0,255,0,0.5)",
          border: "1px solid rgba(0,255,0,0.3)",
          padding: "4px 10px",
          borderRadius: 4,
          zIndex: 1,
        }}
      >
        B-ROLL PLACEHOLDER
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
