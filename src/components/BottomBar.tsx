import React from "react";

type BottomBarProps = {
  handle: string;
  title: string;
  date: string;
};

export const BottomBar: React.FC<BottomBarProps> = ({ handle, title, date }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 180,
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 24px 28px 24px",
        zIndex: 30,
      }}
    >
      {/* Row 1: Avatar + Handle + Subscribe */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Circular avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: "#00FF00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            fontWeight: "bold",
            fontSize: 20,
            color: "#000",
            flexShrink: 0,
          }}
        >
          N
        </div>

        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 17,
            fontWeight: 600,
            color: "#ffffff",
          }}
        >
          {handle}
        </span>

        {/* Subscribe pill */}
        <div
          style={{
            marginLeft: 8,
            padding: "6px 16px",
            borderRadius: 20,
            backgroundColor: "#ffffff",
            fontFamily: "sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: "#000000",
            letterSpacing: 0.3,
            flexShrink: 0,
          }}
        >
          Subscribe
        </div>
      </div>

      {/* Row 2: Title + Date */}
      <div style={{ marginTop: 8, paddingLeft: 56 }}>
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 15,
            fontWeight: 400,
            color: "rgba(255,255,255,0.6)",
            marginLeft: 8,
          }}
        >
          {date}
        </span>
      </div>
    </div>
  );
};
