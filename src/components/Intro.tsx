import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";

const { fontFamily } = loadFont();

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo fades + scales in over first 20 frames
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoScale = interpolate(frame, [0, 20], [0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline fades in starting at frame 45 (1.5s)
  const taglineOpacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateLeft: "clamp",
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
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      {/* Novig logo mark */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* N circle */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            backgroundColor: "#00FF00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 60px rgba(0,255,0,0.4)",
          }}
        >
          <span
            style={{
              fontFamily,
              fontSize: 100,
              color: "#000000",
              lineHeight: 1,
            }}
          >
            N
          </span>
        </div>

        {/* NOVIG wordmark */}
        <span
          style={{
            fontFamily,
            fontSize: 72,
            color: "#ffffff",
            letterSpacing: 12,
            textTransform: "uppercase",
          }}
        >
          NOVIG
        </span>
      </div>

      {/* Tagline */}
      <span
        style={{
          opacity: taglineOpacity,
          fontFamily,
          fontSize: 36,
          color: "#00FF00",
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        Zero Vig. Best Lines.
      </span>
    </div>
  );
};
