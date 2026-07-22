import React from "react";
import { useSeo } from "@/utils/useSeo";

export default function Upgrader() {
  useSeo({
    title: "Upgrader — Maintenance | GemTide",
    description: "Upgrader is temporarily offline.",
    path: "/upgrader",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#020008",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      overflow: "hidden",
      userSelect: "none",
    }}>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes gridMove   { from { background-position: 0 0; } to { background-position: 60px 60px; } }
        @keyframes pulseGlow  { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes scanline   { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        @keyframes glitch1    { 0%,95%,100%{clip-path:none;transform:none} 96%{clip-path:inset(20% 0 60% 0);transform:translateX(-6px)} 97%{clip-path:inset(60% 0 10% 0);transform:translateX(6px)} 98%{clip-path:inset(40% 0 40% 0);transform:translateX(-3px)} }
        @keyframes glitch2    { 0%,95%,100%{opacity:0} 96%,98%{opacity:1} 97%,99%{opacity:0} }
        @keyframes floatUp    { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-12px)} }
        @keyframes shimmer    { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes borderPulse{ 0%,100%{box-shadow:0 0 0 1px rgba(180,80,255,.4),0 0 30px rgba(180,80,255,.15)} 50%{box-shadow:0 0 0 1px rgba(255,80,200,.7),0 0 60px rgba(255,80,200,.3)} }
        @keyframes warnFlash  { 0%,100%{background:rgba(255,30,30,.12);border-color:rgba(255,70,70,.4)} 50%{background:rgba(255,30,30,.22);border-color:rgba(255,100,100,.7)} }
        @keyframes orbit      { from{transform:rotate(0deg) translateX(220px) rotate(0deg)} to{transform:rotate(360deg) translateX(220px) rotate(-360deg)} }
        @keyframes orbit2     { from{transform:rotate(180deg) translateX(300px) rotate(-180deg)} to{transform:rotate(540deg) translateX(300px) rotate(-540deg)} }
        @keyframes spin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Moving grid background ── */}
      <div style={{
        position:"absolute", inset:0, zIndex:0,
        backgroundImage:
          "linear-gradient(rgba(130,50,255,.07) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(130,50,255,.07) 1px, transparent 1px)",
        backgroundSize:"60px 60px",
        animation:"gridMove 4s linear infinite",
      }} />

      {/* ── Deep radial vignette ── */}
      <div style={{
        position:"absolute", inset:0, zIndex:1,
        background:"radial-gradient(ellipse 80% 70% at 50% 50%, transparent 20%, #020008 100%)",
      }} />

      {/* ── Orbiting blobs ── */}
      <div style={{ position:"absolute", inset:0, zIndex:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"relative", width:0, height:0 }}>
          <div style={{
            position:"absolute", width:24, height:24, borderRadius:"50%",
            background:"radial-gradient(circle, #c050ff 0%, transparent 70%)",
            filter:"blur(8px)", boxShadow:"0 0 30px 10px rgba(180,50,255,.5)",
            animation:"orbit 9s linear infinite",
          }} />
          <div style={{
            position:"absolute", width:16, height:16, borderRadius:"50%",
            background:"radial-gradient(circle, #ff40b0 0%, transparent 70%)",
            filter:"blur(6px)", boxShadow:"0 0 20px 8px rgba(255,60,160,.45)",
            animation:"orbit2 14s linear infinite",
          }} />
        </div>
      </div>

      {/* ── Slow scanline sweep ── */}
      <div style={{
        position:"absolute", inset:0, zIndex:2, pointerEvents:"none",
        background:"linear-gradient(to bottom, transparent 0%, rgba(160,80,255,.04) 50%, transparent 100%)",
        height:"200px", width:"100%",
        animation:"scanline 8s linear infinite",
      }} />

      {/* ── Main card ── */}
      <div style={{
        position:"relative", zIndex:10,
        display:"flex", flexDirection:"column", alignItems:"center",
        gap:28, padding:"52px 48px 44px",
        maxWidth:660, width:"90%",
        border:"1px solid rgba(160,60,255,.25)",
        borderRadius:24,
        background:"linear-gradient(160deg, rgba(30,10,60,.85) 0%, rgba(10,2,22,.9) 100%)",
        backdropFilter:"blur(18px)",
        animation:"borderPulse 3s ease-in-out infinite",
      }}>

        {/* gear icon */}
        <div style={{ fontSize:64, lineHeight:1, animation:"floatUp 3.5s ease-in-out infinite, pulseGlow 3s ease-in-out infinite" }}>
          ⚙️
        </div>

        {/* UPGRADER heading with glitch */}
        <div style={{ position:"relative", textAlign:"center" }}>
          {/* ghost copy for glitch */}
          <h1 aria-hidden="true" style={{
            position:"absolute", inset:0,
            margin:0, fontSize:"clamp(36px,7vw,72px)", fontWeight:900,
            letterSpacing:"-0.03em", lineHeight:1,
            background:"linear-gradient(135deg,#ff40b0,#c050ff)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            animation:"glitch1 5s infinite, glitch2 5s infinite",
            pointerEvents:"none",
          }}>UPGRADER</h1>

          <h1 style={{
            margin:0, fontSize:"clamp(36px,7vw,72px)", fontWeight:900,
            letterSpacing:"-0.03em", lineHeight:1,
            background:"linear-gradient(135deg,#ffffff 0%,#d090ff 45%,#ff50b8 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            filter:"drop-shadow(0 0 40px rgba(180,80,255,.7))",
          }}>UPGRADER</h1>

          <p style={{
            margin:"8px 0 0", fontSize:"clamp(13px,2vw,16px)", fontWeight:700,
            letterSpacing:"0.35em", textTransform:"uppercase",
            color:"rgba(200,150,255,.55)",
          }}>— DOWN FOR MAINTENANCE —</p>
        </div>

        {/* shimmer divider */}
        <div style={{
          width:"100%", height:1,
          background:"linear-gradient(90deg,transparent,rgba(180,80,255,.7),rgba(255,80,180,.7),transparent)",
          animation:"pulseGlow 2.5s ease-in-out infinite",
        }} />

        {/* Sorry message */}
        <div style={{ textAlign:"center" }}>
          <p style={{
            margin:0, fontSize:"clamp(18px,3.5vw,28px)", fontWeight:800,
            color:"#f0e0ff", lineHeight:1.4,
            textShadow:"0 0 30px rgba(180,80,255,.6)",
          }}>
            Sorry, Upgrader will be{" "}
            <span style={{
              background:"linear-gradient(90deg,#d090ff,#ff50b8)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              backgroundSize:"200% auto",
              animation:"shimmer 2.5s linear infinite",
            }}>back soon</span>
          </p>
        </div>

        {/* Ping Flipper pill */}
        <div style={{
          display:"flex", alignItems:"center", gap:12,
          padding:"14px 24px", borderRadius:50,
          background:"rgba(180,80,255,.12)",
          border:"1px solid rgba(180,80,255,.35)",
          boxShadow:"0 0 24px rgba(180,80,255,.2)",
        }}>
          <span style={{ fontSize:22 }}>🏓</span>
          <p style={{
            margin:0, fontSize:"clamp(13px,2.2vw,17px)", fontWeight:700,
            color:"#e0c0ff",
          }}>
            Wanna complain?{" "}
            <span style={{
              background:"linear-gradient(90deg,#c050ff,#ff40b0)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              fontWeight:900, fontSize:"1.1em",
            }}>Spam ping Flipper</span>
          </p>
          <span style={{ fontSize:22 }}>🏓</span>
        </div>

        {/* Ban warning box */}
        <div style={{
          width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:12,
          padding:"14px 20px", borderRadius:14,
          animation:"warnFlash 2s ease-in-out infinite",
          border:"1px solid rgba(255,70,70,.4)",
        }}>
          <span style={{ fontSize:26, flexShrink:0 }}>🚫</span>
          <p style={{
            margin:0, textAlign:"center",
            fontSize:"clamp(12px,2vw,15px)", fontWeight:800,
            color:"#ff8080", lineHeight:1.5,
            textShadow:"0 0 16px rgba(255,50,50,.6)",
            letterSpacing:"0.01em",
          }}>
            Ping{" "}
            <span style={{
              textDecoration:"line-through",
              textDecorationColor:"rgba(255,100,100,.7)",
              opacity:.65, fontStyle:"italic",
            }}>Knowni1</span>
            {" "}and you{" "}
            <span style={{
              color:"#ff3030",
              textShadow:"0 0 20px rgba(255,0,0,.9)",
              fontSize:"1.15em",
            }}>WILL GET BANNED</span>
          </p>
          <span style={{ fontSize:26, flexShrink:0 }}>🚫</span>
        </div>

      </div>
    </div>
  );
}
