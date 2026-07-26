import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import UserContext from "../../utils/user.js";

const GEM_IMG =
  "https://cdn.discordapp.com/attachments/1522618058265460756/1522857070339293284/pet-simulator-99-gems.png";

export default function Referral() {
  const { code } = useParams();
  const navigate  = useNavigate();
  const { userData } = useContext(UserContext);

  const [status, setStatus] = useState("idle"); // idle | applying | success | error | already | novpn | alt | noauth
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!code) { navigate("/"); return; }

    // Not logged in — store the code and send them to login
    if (!getauth()) {
      sessionStorage.setItem("pendingReferral", code.toUpperCase());
      setStatus("noauth");
      return;
    }

    applyCode();
  }, [code]);

  async function applyCode() {
    setStatus("applying");
    try {
      const r = await fetch(`${api}/affiliate/usecode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${getauth()}`,
        },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();

      if (r.ok) {
        setStatus("success");
        setMessage(d.message || `Code "${code}" applied!`);
        toast.success("Affiliate code applied!");
        setTimeout(() => navigate("/profile?tab=affiliate"), 2800);
      } else if (r.status === 409) {
        setStatus("already");
        setMessage(d.message || "You have already used an affiliate code.");
        setTimeout(() => navigate("/profile?tab=affiliate"), 2800);
      } else if (r.status === 403) {
        setStatus("blocked");
        setMessage(d.message || "Unable to apply code.");
      } else {
        setStatus("error");
        setMessage(d.message || "Could not apply that code.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  const redirectLogin = () => {
    sessionStorage.setItem("pendingReferral", code?.toUpperCase() || "");
    // Send to home; they can log in from there
    navigate("/");
    toast("Log in first, then your code will be applied automatically.");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0c0c0c", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui,-apple-system,sans-serif",
    }}>
      <div style={{
        background: "#111", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: "40px 48px", maxWidth: 420, width: "90%",
        textAlign: "center", boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
      }}>
        {/* Gem icon */}
        <img src={GEM_IMG} alt="gems" style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 20 }} />

        {/* Code badge */}
        <div style={{
          display: "inline-block", background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.35)", borderRadius: 8,
          padding: "5px 14px", fontSize: 13, fontWeight: 700,
          color: "#a78bfa", letterSpacing: "0.08em", marginBottom: 24, fontFamily: "monospace",
        }}>
          {code?.toUpperCase()}
        </div>

        {status === "idle" || status === "applying" ? (
          <>
            <Spinner />
            <div style={{ marginTop: 16, color: "#888", fontSize: 14 }}>Applying affiliate code…</div>
          </>
        ) : status === "success" ? (
          <>
            <CheckIcon color="#4ade80" />
            <h2 style={{ color: "#4ade80", fontSize: 18, fontWeight: 700, margin: "14px 0 8px" }}>Code Applied!</h2>
            <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{message}</p>
            <p style={{ color: "#555", fontSize: 12, marginTop: 12 }}>Redirecting to your affiliate page…</p>
          </>
        ) : status === "already" ? (
          <>
            <CheckIcon color="#8B5CF6" />
            <h2 style={{ color: "#8B5CF6", fontSize: 18, fontWeight: 700, margin: "14px 0 8px" }}>Already Applied</h2>
            <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{message}</p>
            <p style={{ color: "#555", fontSize: 12, marginTop: 12 }}>Redirecting…</p>
          </>
        ) : status === "noauth" ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Log in to use this code</h2>
            <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Sign in with Discord to apply&nbsp;
              <span style={{ color: "#a78bfa", fontFamily: "monospace", fontWeight: 700 }}>{code?.toUpperCase()}</span>.
            </p>
            <button
              onClick={redirectLogin}
              style={{
                background: "#5865F2", color: "#fff", border: "none",
                borderRadius: 8, padding: "10px 24px", fontSize: 14,
                fontWeight: 600, cursor: "pointer", width: "100%",
              }}
            >
              Go to GemTide and Log In
            </button>
          </>
        ) : status === "blocked" ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🚫</div>
            <h2 style={{ color: "#f87171", fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Blocked</h2>
            <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
            <button onClick={() => navigate("/")} style={backBtnStyle}>Back to Home</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>❌</div>
            <h2 style={{ color: "#f87171", fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Couldn't Apply Code</h2>
            <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={applyCode} style={primaryBtnStyle}>Retry</button>
              <button onClick={() => navigate("/")} style={backBtnStyle}>Back to Home</button>
            </div>
          </>
        )}

        {/* Footer note */}
        {(status === "success" || status === "applying" || status === "idle") && (
          <p style={{ marginTop: 24, fontSize: 11, color: "#444", lineHeight: 1.5 }}>
            Deposit <strong style={{ color: "#666" }}>10M gems</strong> and wager <strong style={{ color: "#666" }}>30M gems</strong> to complete the referral.
          </p>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{
        width: 36, height: 36, border: "3px solid rgba(139,92,246,0.2)",
        borderTop: "3px solid #8B5CF6", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CheckIcon({ color }) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="2.5" opacity="0.25" />
        <polyline points="14,24 21,31 34,17" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const primaryBtnStyle = {
  background: "#8B5CF6", color: "#fff", border: "none",
  borderRadius: 8, padding: "9px 20px", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};
const backBtnStyle = {
  background: "transparent", color: "#888",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, padding: "9px 20px", fontSize: 13,
  fontWeight: 500, cursor: "pointer",
};
