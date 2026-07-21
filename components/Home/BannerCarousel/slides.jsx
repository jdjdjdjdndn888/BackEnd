/**
 * @typedef {Object} BannerSlide
 * @property {string} imgSmall
 * @property {string} imgLarge
 * @property {import("react").ReactNode} [title]
 * @property {import("react").ReactNode} [description]
 * @property {import("react").ReactNode} [button]
 * @property {string} [className]
 */

import Profile from "@/components/popup/profile";
import { Banner } from "./components";
import Deposit from "@/components/popup/deposit";
import LoginModal from "@/components/popup/login";
import { useNavigate } from "react-router-dom";

/** @type {BannerSlide[]} */
export const banners = [
  {
    title: <Banner.Title>🎁 Cases are here — open now!</Banner.Title>,
    description: (
      <Banner.Description className="md:my-4">
        Spend gems, spin the reel, and win rare PS99 items. New cases added weekly!
      </Banner.Description>
    ),
    button: (
      <Banner.Button
        action={() => { window.location.href = "/cases"; }}
      >
        Open Cases →
      </Banner.Button>
    ),
    imgLarge: "/banner/cases.png",
    imgSmall: "/banner/cases.png",
    className: "[&_img]:[filter:brightness(0.55)]",
  },
  {
    title: <Banner.Title>Claim your welcome offer today!</Banner.Title>,
    description: (
      <Banner.Description className="md:my-4">
        +50% Bonus up to $7.5$ and 3 Free Items!
      </Banner.Description>
    ),
    button: (
      <Banner.Button
        action={(setModalState, userData) => {
          setModalState(userData ? <Deposit /> : <LoginModal />);
        }}
      >
        Sign Up Now!
      </Banner.Button>
    ),
    imgLarge: "/banner/1.png",
    imgSmall: "/banner/1.png",
    className: "[&_img]:[filter:brightness(0.5)]",
  },
  {
    title: <Banner.Title>🔥 #1 Sab Gambling is NOW LIVE!</Banner.Title>,
    description: (
      <Banner.Description className="md:my-4">
        Sab items? We got you. Open a support ticket to deposit and start gambling. PS99 is fully automatic — just join the bots and trade. No waiting, no hassle.
      </Banner.Description>
    ),
    button: (
      <Banner.Button
        action={() => { window.location.href = "/support"; }}
      >
        Open a Ticket →
      </Banner.Button>
    ),
    imgLarge: "/banner/2.png",
    imgSmall: "/banner/2.png",
    className: "[&_img]:[filter:brightness(0.6)]",
  },
];
