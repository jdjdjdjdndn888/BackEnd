import React, { useState, useContext } from "react";
import { useModal } from "../../utils/ModalContext";
import { api } from "../../config.js";
import UserContext from "../../utils/user.js";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const STEPS = { USERNAME: "username", VERIFY: "verify", CHECKING: "checking" };

export default function LoginModal() {
  const { setModalState } = useModal();
  const { setUserData } = useContext(UserContext);

  const [step, setStep] = useState(STEPS.USERNAME);
  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [phase, setPhase] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGetCode = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    if (!agreed) { toast.error("Please agree to the terms of service."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${api}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.code) {
        toast.error(data.message || "Could not find that username.");
        return;
      }
      setCode(data.code);
      setPhase(data.phase);
      setStep(STEPS.VERIFY);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(phase).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleVerify = async () => {
    setStep(STEPS.CHECKING);
    setLoading(true);
    try {
      const res = await fetch(`${api}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok || !data.hash) {
        toast.error(data.message || "Verification failed. Make sure the code is in your bio.");
        setStep(STEPS.VERIFY);
        return;
      }
      Cookies.set("token", data.hash, { expires: 30 });
      localStorage.setItem("token", data.hash);

      const meRes = await fetch(`${api}/me`, {
        method: "POST",
        headers: { authorization: `Bearer ${data.hash}` },
      });
      const meData = await meRes.json();
      if (meData?.data) setUserData(meData.data);

      toast.success(`Welcome, ${username}!`);
      setModalState(null);
    } catch {
      toast.error("Network error. Try again.");
      setStep(STEPS.VERIFY);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => setModalState(null)}
    >
      <div
        className="relative flex w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "#161b2e" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left — banner image */}
        <div className="hidden sm:block w-64 shrink-0 relative">
          <img
            src="/login-banner.png"
            alt="GemTide"
            className="h-full w-full object-cover object-top"
            style={{ minHeight: "480px" }}
          />
          {/* subtle gradient overlay so it blends into the modal */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 70%, #161b2e)" }} />
        </div>

        {/* Right — form */}
        <div className="flex flex-col justify-center flex-1 p-8">
          {/* Close */}
          <button
            className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors text-lg leading-none"
            onClick={() => setModalState(null)}
          >
            ✕
          </button>

          {step === STEPS.USERNAME && (
            <>
              <h2 className="mb-2 text-2xl font-bold text-white">Welcome to GemTide!</h2>
              <p className="mb-6 text-sm text-gray-400">
                By logging in, you confirm that you are at least 18 years old, your items are not
                stolen, and you agree to our{" "}
                <a href="/tos" className="text-[#8B5CF6] hover:underline" onClick={() => setModalState(null)}>
                  Terms of Service
                </a>
                .
              </p>

              <form onSubmit={handleGetCode} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Game Username</label>
                  <input
                    type="text"
                    placeholder="Enter your Username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-[#2a3050] bg-[#1e2540] px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#8B5CF6] transition-colors"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 accent-[#8B5CF6] cursor-pointer"
                  />
                  <span className="text-sm text-gray-400">
                    I agree to the{" "}
                    <a href="/tos" className="text-[#8B5CF6] hover:underline" onClick={() => setModalState(null)}>
                      terms of service
                    </a>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className="w-full rounded-xl py-3 font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(90deg, #7C3AED, #6D28D9)" }}
                >
                  {loading ? "Looking up..." : "Continue"}
                </button>
              </form>
            </>
          )}

          {step === STEPS.VERIFY && (
            <>
              <h2 className="mb-2 text-2xl font-bold text-white">Verify Your Account</h2>
              <p className="mb-5 text-sm text-gray-400">
                Put this code in your Roblox profile bio, then click verify below.
              </p>

              <div className="mb-5 rounded-xl border border-[#2a3050] bg-[#1e2540] p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Your Code</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="break-all font-mono text-sm font-semibold text-white">{phase}</span>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-lg bg-[#292F45] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#363d5a]"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <ol className="mb-6 space-y-2 text-sm text-gray-400">
                {[
                  ["Go to your Roblox profile and click ", "Edit Profile"],
                  ["Paste the code above into your ", "About / Bio section"],
                  ["Save, then click ", "Verify below"],
                ].map(([pre, bold], i) => (
                  <li key={i} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {pre}<strong className="text-gray-300 ml-1">{bold}</strong>
                  </li>
                ))}
              </ol>

              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full rounded-xl py-3 font-semibold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(90deg, #7C3AED, #6D28D9)" }}
              >
                I've added it — Verify Me
              </button>
              <button
                onClick={() => setStep(STEPS.USERNAME)}
                className="mt-3 w-full rounded-xl py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Back
              </button>
            </>
          )}

          {step === STEPS.CHECKING && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B5CF6] border-t-transparent" />
              <p className="text-lg font-semibold text-white">Checking your bio...</p>
              <p className="text-sm text-gray-400">Looking for the code on your Roblox profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
