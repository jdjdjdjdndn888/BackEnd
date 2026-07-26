import Cookies from "js-cookie";

export function getauth() {
  return Cookies.get("token") || localStorage.getItem("token") || "";
}
