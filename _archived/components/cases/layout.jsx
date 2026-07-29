import React from "react";
import { useNavigate } from "react-router-dom";
import { useSeo } from "@/utils/useSeo";

export default function CasesPage() {
  const navigate = useNavigate();
  useSeo({
    title: "Cases — Coming Soon | GemTide",
    description: "Cases is coming soon.",
    path: "/cases",
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
