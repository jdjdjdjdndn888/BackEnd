import EmojiPicker from "emoji-picker-react";
import { useEffect, useState, useRef, useContext, useCallback, forwardRef } from "react";
import { FaSmile } from "react-icons/fa";
import { MdSend } from "react-icons/md";
import UserContext from "../../utils/user.js";
import chatstyle from "./chat.module.css";

/**
 * @typedef {Object} ChatInputProps
 * @property {string} message
 * @property {import("react").Dispatch<import("react").SetStateAction<string>>} setMessage
 * @property {boolean} canSend
 * @property {() => Promise<void>} sendMessage
 */

/** @type {import("react").FC<ChatInputProps>} */
export const ChatInput = ({ canSend, message, setMessage, sendMessage }) => {
  const { userData } = useContext(UserContext);
  const isLoggedIn = !!userData?.userid;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiPickerTriggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !emojiPickerTriggerRef.current?.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmojiClick = useCallback((emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  }, [setMessage]);

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        placeholder={isLoggedIn ? "Say something..." : "Login to chat"}
        style={{
          boxSizing: "border-box", width: "100%",
          background: "#111",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "10px 56px 10px 14px",
          fontSize: 12, fontWeight: 500,
          color: "#ccc",
          outline: "none",
        }}
        className="placeholder:text-[#444]"
        value={message}
        disabled={!isLoggedIn || !canSend}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && canSend && sendMessage()}
      />
      <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: "0.5rem", display: "flex", alignItems: "center", gap: 4 }}>
        <InputButton aria-label="Emoji Picker" onClick={() => setShowEmojiPicker((p) => !p)} ref={emojiPickerTriggerRef}>
          <FaSmile />
        </InputButton>
        <InputButton aria-label="Send" onClick={sendMessage} disabled={!canSend}>
          <MdSend />
        </InputButton>
      </div>

      {showEmojiPicker && (
        <div className={chatstyle.emojiPickerContainer} ref={emojiPickerRef}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            skinTonesDisabled
            autoFocusSearch={false}
            theme="dark"
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </div>
  );
};

const InputButton = forwardRef((props, ref) => (
  <button
    style={{
      display: "inline-grid", aspectRatio: "1", width: 28, flexShrink: 0,
      cursor: "pointer", placeContent: "center",
      background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6, transition: "background 0.15s",
    }}
    className="[&>svg]:fill-[#444] hover:bg-[rgba(255,255,255,0.05)] [&:hover>svg]:fill-[#888]"
    ref={ref}
    {...props}
  />
));
