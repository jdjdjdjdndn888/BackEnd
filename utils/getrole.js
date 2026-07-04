export function getrole(role) {
  const roles = {
    0: "User",
    1: "Moderator",
    2: "Admin",
    3: "Owner",
  };
  return roles[role] || "User";
}
