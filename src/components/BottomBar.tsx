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
        height: 80,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        zIndex: 30,
      }}
    >
      {/* Left side: avatar + handle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "#00FF00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            fontWeight: "bold",
            fontSize: 18,
            color: "#000",
          }}
        >
          N
        </div>
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 16,
            color: "#ffffff",
          }}
        >
          {handle}
        </span>
      </div>

      {/* Right side: title + date */}
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 16,
            fontWeight: 500,
            color: "#ffffff",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {date}
        </div>
      </div>
    </div>
  );
};
