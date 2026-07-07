import { useContext, useEffect, useState } from "react";
import { GamesSection } from "./GamesSection";
import { HeroCarousel } from "./HeroCarousel";
import { StatsBar } from "./StatsBar";
import SocketContext from "@/utils/socket";

export const Home = () => {
  const socket = useContext(SocketContext);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!socket) return;
    socket.on("ONLINE_UPDATE", setOnlineCount);
    return () => socket.off("ONLINE_UPDATE", setOnlineCount);
  }, [socket]);

  return (
    <div className="px-4 py-4 md:px-6">
      {/* Hero banner carousel — unchanged */}
      <HeroCarousel />

      {/* Live stats bar */}
      <StatsBar onlineCount={onlineCount} />

      {/* Games grid — unchanged */}
      <GamesSection />
    </div>
  );
};
