import React from "react";
import { useNavigate } from "react-router-dom";
import { useSeo } from "@/utils/useSeo";

export default function Upgrader() {
  const navigate = useNavigate();
  useSeo({
    title: "Upgrader — Coming Soon | GemTide",
    description: "Upgrader is coming soon.",
    path: "/upgrader",
  });

  return (
    <div
      onClick={() => navigate("/")}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#000",
        overflow: "hidden",
        userSelect: "none",
        cursor: "pointer",
      }}
    >
      <img
        src="/coming-soon.png"
        alt="Coming Soon"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
