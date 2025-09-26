export const API_KEY = "1e9020ef-9135-4549-a501-568e3411ccc6";
export const API_BASE = "https://v2.api.noroff.dev";

export const API_AUTH = `${API_BASE}/auth`;
export const API_AUTH_REGISTER = `${API_AUTH}/register`;
export const API_AUTH_LOGIN = `${API_AUTH}/login`;

export const API_SOCIAL = `${API_BASE}/social`;
export const API_SOCIAL_POSTS = `${API_SOCIAL}/posts`;
export const API_SOCIAL_PROFILES = `${API_SOCIAL}/profiles`;

function findTokenInStorage(storage) {
  for (const k of ["accessToken", "token"]) {
    const v = storage.getItem(k);
    if (v) return v;
  }
  for (const k of ["user", "auth", "profile", "account", "data"]) {
    const raw = storage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      if (obj?.accessToken) return obj.accessToken;
      if (obj?.token) return obj.token;
      if (obj?.data?.accessToken) return obj.data.accessToken;
    } catch {}
  }
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    const val = storage.getItem(key) || "";
    if (typeof val === "string" && val.includes(".") && val.split(".").length >= 3) return val;
    try {
      const obj = JSON.parse(val);
      const cand = obj?.accessToken || obj?.token || obj?.data?.accessToken;
      if (typeof cand === "string" && cand.includes(".") && cand.split(".").length >= 3) return cand;
    } catch {}
  }
  return null;
}

export function getToken() {
  return findTokenInStorage(localStorage) || findTokenInStorage(sessionStorage);
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch(url, options = {}) {
  const token = getToken();

  const baseHeaders = {
    "X-Noroff-API-Key": (API_KEY || "").trim(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const needsJson = !!options.body && !(
    options.headers && ("content-type" in Object.keys(options.headers).reduce((acc,k)=>{acc[k.toLowerCase()]=true;return acc;},{}))
  );

  const headers = {
    ...baseHeaders,
    ...(needsJson ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  let payload;
  try { payload = await res.json(); } catch { payload = {}; }

  if (!res.ok) {
    const msg =
      payload?.errors?.[0]?.message ||
      payload?.message ||
      res.statusText || "Request failed";
    throw new ApiError(res.status, msg);
  }
  return payload?.data ?? payload;
}

export async function fetchJson(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE}${pathOrUrl}`;
  return apiFetch(url, options);
}
