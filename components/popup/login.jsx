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
  const [phase, setPhase] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGetCode = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => setModalState(null)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#161b2e] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
          onClick={() => setModalState(null)}
        >
          ✕
        </button>

        {step === STEPS.USERNAME && (
          <>
            <h2 className="mb-1 text-center text-2xl font-bold text-white">Sign In</h2>
            <p className="mb-6 text-center text-sm text-gray-400">Enter your Roblox username to get started</p>
            <form onSubmit={handleGetCode}>
              <input
                type="text"
                placeholder="Roblox Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                className="mb-4 w-full rounded-xl border border-[#2a3050] bg-[#1e2540] px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#8B5CF6] transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="w-full rounded-xl bg-[#8B5CF6] py-3 font-semibold text-white transition hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Looking up..." : "Get Verification Code"}
              </button>
            </form>
          </>
        )}

        {step === STEPS.VERIFY && (
          <>
            <h2 className="mb-1 text-center text-2xl font-bold text-white">Verify Your Account</h2>
            <p className="mb-5 text-center text-sm text-gray-400">
              Put this code in your Roblox profile bio, then click the button below
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
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-xs font-bold text-white">1</span>
                Go to your Roblox profile and click <strong className="text-gray-300 ml-1">Edit Profile</strong>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-xs font-bold text-white">2</span>
                Paste the code above into your <strong className="text-gray-300 ml-1">About / Bio</strong> section
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-xs font-bold text-white">3</span>
                Save, then click <strong className="text-gray-300 ml-1">Verify below</strong>
              </li>
            </ol>

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full rounded-xl bg-[#8B5CF6] py-3 font-semibold text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
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
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B5CF6] border-t-transparent" />
            <p className="text-lg font-semibold text-white">Checking your bio...</p>
            <p className="text-sm text-gray-400">Looking for the code on your Roblox profile</p>
          </div>
        )}
      </div>
    </div>
  );
}
