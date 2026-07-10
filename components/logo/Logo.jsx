export default function Logo({ size = "md" }) {
  const heights = { sm: "h-7", md: "h-9", lg: "h-14" };
  return (
    <img
      src="/logo-gemtide.png"
      alt="GemTide"
      className={`${heights[size]} w-auto object-contain`}
      draggable={false}
    />
  );
}
