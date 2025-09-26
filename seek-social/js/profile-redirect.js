// Minimal "My profile" redirect → bruker samme side som andre profiler
import { getToken } from "./api.js";

function decodeNameFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.name || payload?.username || payload?.sub || null;
  } catch {
    return null;
  }
}

function findStoredName() {
  const candidates = ["username", "name", "user", "profile", "account", "auth"];
  for (const key of candidates) {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) continue;
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (typeof obj === "string" && obj) return obj;
      if (obj?.name) return obj.name;
      if (obj?.user?.name) return obj.user.name;
      if (obj?.profile?.name) return obj.profile.name;
    } catch {
      if (typeof raw === "string" && raw) return raw;
    }
  }
  return null;
}

(function go() {
  const me = decodeNameFromToken() || findStoredName();
  if (!me) {
    const redirect = encodeURIComponent("/profile/index.html");
    window.location.href = `../auth/login.html?redirect=${redirect}`;
    return;
  }
  const url = `./user.html?name=${encodeURIComponent(me)}`;
  window.location.replace(url);
})();
