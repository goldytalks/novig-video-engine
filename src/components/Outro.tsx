import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Anton";

const { fontFamily } = loadFont();

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const logo = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cta = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tagline = interpolate(frame, [35, 55], [0, 1], {
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
        gap: 48,
      }}
    >
      {/* Logo */}
      <div
        style={{
          opacity: logo,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
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
              fontSize: 88,
              color: "#000000",
              lineHeight: 1,
            }}
          >
            N
          </span>
        </div>
        <span
          style={{
            fontFamily,
            fontSize: 60,
            color: "#ffffff",
            letterSpacing: 10,
          }}
        >
          NOVIG
        </span>
      </div>

      {/* Download CTA */}
      <div style={{ opacity: cta, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div
          style={{
            backgroundColor: "#00FF00",
            borderRadius: 16,
            padding: "28px 64px",
          }}
        >
          <span
            style={{
              fontFamily,
              fontSize: 52,
              color: "#000000",
              letterSpacing: 2,
            }}
          >
            DOWNLOAD FREE
          </span>
        </div>
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 28,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: 1,
          }}
        >
          Link in Bio
        </span>
      </div>

      {/* Tagline */}
      <span
        style={{
          opacity: tagline,
          fontFamily,
          fontSize: 32,
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
