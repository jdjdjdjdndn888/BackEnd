export const COLORS = [
  { id: "red",    label: "Red",    hex: "#ef4444" },
  { id: "blue",   label: "Blue",   hex: "#3b82f6" },
  { id: "green",  label: "Green",  hex: "#22c55e" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "purple", label: "Purple", hex: "#a855f7" },
  { id: "pink",   label: "Pink",   hex: "#ec4899" },
  { id: "cyan",   label: "Cyan",   hex: "#06b6d4" },
  { id: "white",  label: "White",  hex: "#f1f5f9" },
  { id: "black",  label: "Black",  hex: "#475569" },
];

export const COLOR_MAP = Object.fromEntries(COLORS.map((c) => [c.id, c]));
