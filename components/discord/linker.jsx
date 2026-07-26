import { useEffect, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useModal } from "../../utils/ModalContext.jsx";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";

export default function LinkDiscord() {
  const location = useLocation();
  const { setModalState, setLoading } = useModal();
  const { userData, setUserData } = useContext(UserContext);
  const navigate = useNavigate();
  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    if (!code) {
      toast.error("No authorization code found.");
      navigate("/profile");
      return;
    }

    const linkDiscord = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${api}/me/discord`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getauth()}`,
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();
        if (response.ok) {
          toast.success("Successfully linked your Discord!");
          if (userData) {
            userData.discordusername = data.username;
            userData.discordid = data.id;
          }
        } else {
          toast.error(data.message || "Could not link your Discord!");
        }
      } catch {
        toast.error("Could not link your Discord!");
      } finally {
        setLoading(false);
        navigate("/profile");
      }
    };

    linkDiscord();
  }, []);

  return null;
}
