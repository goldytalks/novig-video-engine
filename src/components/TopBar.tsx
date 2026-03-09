import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export const TopBar: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        opacity,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
        paddingTop: 24,
        paddingBottom: 32,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0,255,0,0.15)",
          border: "1.5px solid rgba(0,255,0,0.5)",
          borderRadius: 100,
          padding: "10px 36px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: 0.5,
          }}
        >
          📲 Download Novig — Link in Bio
        </span>
      </div>
    </div>
  );
};
