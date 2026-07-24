import React from "react";
import { useSeo } from "@/utils/useSeo";

export default function CasesPage() {
  useSeo({
    title: "Cases — Coming Soon | GemTide",
    description: "Cases is coming soon.",
    path: "/cases",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#000",
      overflow: "hidden",
      userSelect: "none",
      pointerEvents: "none",
    }}>
      <img
        src="/coming-soon.png"
        alt="Coming Soon"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </div>
  );
}
