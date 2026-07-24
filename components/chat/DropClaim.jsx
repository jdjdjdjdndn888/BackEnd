import React, { useState, useEffect, useContext } from "react";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";
import { useModal } from "../../utils/ModalContext";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";

// Detect mobile devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
      || window.innerWidth <= 768;
  });
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// "Enter the code" prompt shown when someone clicks Claim on a chat drop.
// Desktop: requires code (anti-bot). Mobile: 3-second cooldown then claim.
export default function DropClaim({ dropId, itemname, dropCode, onClose }) {
  const { userData } = useContext(UserContext);
  const { setModalState } = useModal();
  const isMobile = useIsMobile();

  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [mobileReady, setMobileReady] = useState(false);

  const close = () => (onClose ? onClose() : setModalState(null));

  // Start countdown for mobile users once the modal opens
  useEffect(() => {
    if (!isMobile || !userData) return;
    setCountdown(3);
    setMobileReady(false);
    let n = 3;
    const tick = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(tick);
        setMobileReady(true);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [isMobile, userData]);

  const handleClaim = async (overrideCode) => {
    if (!userData) return toast.error("You must be logged in to claim drops!");
    // Mobile: use the pre-known drop code (it's public — displayed in the chat card)
    const submittedCode = isMobile ? (dropCode || "") : (overrideCode ?? code.trim());
    if (!isMobile && !submittedCode) return toast.error("Enter the drop code!");

    setClaiming(true);
    try {
      const res = await fetch(`${api}/chat/dropclaim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ dropId, code: submittedCode }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Drop claimed!");
        close();
      } else {
        toast.error(data.message || "Could not claim that drop.");
      }
    } catch {
      toast.error("Error claiming drop.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={close}>
      <div
        className="relative flex flex-col w-[95vw] max-w-sm rounded-2xl bg-[#131520] border border-[#252839] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#252839]">
          <h2 className="text-base font-bold text-white">Claim Drop{itemname ? `: ${itemname}` : ""}</h2>
          <button
            className="text-gray-400 hover:text-white bg-transparent border-none text-2xl cursor-pointer leading-none"
            onClick={close}
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5">
          {!userData ? (
            <p className="text-center text-[#6B7280] py-4">Log in to claim drops.</p>
          ) : isMobile ? (
            /* ── Mobile: countdown then auto-claim ── */
            <>
              <p className="text-sm text-[#A6B2D3] text-center">
                {mobileReady ? "Ready! Tap below to claim your drop." : "Hold on just a moment…"}
              </p>
              {!mobileReady && (
                <div className="flex items-center justify-center">
                  <div
                    className="relative flex items-center justify-center"
                    style={{ width: 72, height: 72 }}
                  >
                    <svg width="72" height="72" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                      <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="5" />
                      <circle
                        cx="36" cy="36" r="30" fill="none"
                        stroke="#8B5CF6" strokeWidth="5"
                        strokeDasharray={`${2 * Math.PI * 30}`}
                        strokeDashoffset={`${2 * Math.PI * 30 * (countdown / 3)}`}
                        style={{ transition: "stroke-dashoffset 0.9s linear" }}
                      />
                    </svg>
                    <span className="text-white font-bold text-2xl relative z-10">{countdown}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={close}
                  className="flex-1 rounded-xl border border-[#252839] bg-transparent py-2 text-sm font-semibold text-[#6B7280] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleClaim()}
                  disabled={!mobileReady || claiming}
                  className="flex-1 rounded-xl border-none py-2 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
                >
                  {claiming ? "Claiming…" : mobileReady ? "Claim 🎉" : `Wait ${countdown}s…`}
                </button>
              </div>
            </>
          ) : (
            /* ── Desktop: code entry ── */
            <>
              <p className="text-sm text-[#A6B2D3]">Enter the code shown with this drop:</p>
              <input
                type="text"
                autoFocus
                placeholder="e.g. 4F9A2C"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                className="w-full rounded-lg bg-[#1C1F2E] border border-[#252839] px-3 py-2 text-sm text-white text-center tracking-[0.2em] font-bold placeholder:tracking-normal placeholder:font-normal placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]"
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={close}
                  className="flex-1 rounded-xl border border-[#252839] bg-transparent py-2 text-sm font-semibold text-[#6B7280] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleClaim()}
                  disabled={claiming || !code.trim()}
                  className="flex-1 rounded-xl border-none py-2 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
                >
                  {claiming ? "Claiming…" : "Claim"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
