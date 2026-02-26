import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Sidebar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Line draws from top to bottom over 30 frames
  const lineProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineHeight = 75; // percent
  const lineTop = 12.5; // percent

  // 3 dots at 25%, 50%, 75% of line height, staggered by 15 frames
  const dots = [0.25, 0.5, 0.75].map((position, i) => {
    const dotSpring = spring({
      frame: frame - i * 15,
      fps,
      config: { damping: 12, stiffness: 200 },
    });

    // Pulse opacity between 0.7 and 1.0 every 45 frames after appearing
    const pulseFrame = Math.max(0, frame - i * 15 - 20);
    const pulseOpacity = interpolate(
      Math.sin((pulseFrame / 45) * Math.PI * 2),
      [-1, 1],
      [0.7, 1.0]
    );

    return {
      position,
      scale: dotSpring,
      opacity: dotSpring > 0.01 ? pulseOpacity : 0,
    };
  });

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
      }}
    >
      {/* Vertical neon green line */}
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

      {/* Dots */}
      {dots.map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${dot.position * 100}%`,
            left: "50%",
            transform: `translate(-50%, -50%) scale(${dot.scale})`,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#00FF00",
            boxShadow: "0 0 10px #00FF00, 0 0 20px #00FF00",
            opacity: dot.opacity,
          }}
        />
      ))}
    </div>
  );
};
