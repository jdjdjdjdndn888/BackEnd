import { GamesSection } from "./GamesSection";
import { HeroCarousel } from "./HeroCarousel";

export const Home = () => {
  return (
    <div className="px-4 py-4 md:px-6">
      <HeroCarousel />

      <GamesSection />
    </div>
  );
};
