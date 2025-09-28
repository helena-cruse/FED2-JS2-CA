(function () {
  function apiNS() { return window.api || window.API || {}; }
  function apiBase() { const a = apiNS(); return a.base || a.BASE_URL || a.API_BASE || ""; }
  function getToken() {
    const a = apiNS();
    try { if (typeof a.getToken === "function") { const t = a.getToken(); if (t) return t.accessToken || t.token || t; } } catch {}
    try { if (typeof a.getAuth === "function") { const au = a.getAuth(); if (au) return au.accessToken || au.token; } } catch {}
    try { const au = JSON.parse(localStorage.getItem("auth") || "{}"); if (au) return au.accessToken || au.token; } catch {}
    try { const t = localStorage.getItem("accessToken") || localStorage.getItem("token"); if (t) return t; } catch {}
    return null;
  }
  async function request(path, { method = "GET", body, auth = false, headers = {} } = {}) {
    const a = apiNS();
    if (typeof a.request === "function") return a.request(path, { method, body, auth });
    if (typeof a.authRequest === "function" && auth) return a.authRequest(path, { method, body });
    const base = apiBase();
    const url = base ? `${base}${path}` : path;
    const token = auth ? getToken() : null;
    const h = { "Content-Type": "application/json", "Cache-Control": "no-cache", ...headers };
    if (auth && token) h.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.errors?.[0]?.message || data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }
  async function retryGet(path, tries, waitMs, auth) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
      try { return await request(path + (path.includes("?") ? "&" : "?") + "fresh=" + Date.now(), { auth }); }
      catch (e) { lastErr = e; await new Promise(r => setTimeout(r, waitMs)); }
    }
    throw lastErr || new Error("Request failed");
  }
  function qs(s, r = document) { return r.querySelector(s); }
  function field(name, id) { return qs(`[name="${name}"]`) || (id ? qs(`#${id}`) : null); }
  function val(el) { return (el && typeof el.value === "string") ? el.value.trim() : ""; }
  function tagsFrom(raw) { return (raw || "").split(",").map(t => t.trim()).filter(Boolean); }
  function busy(el, b) { if (!el) return; el.disabled = !!b; el.setAttribute("aria-busy", b ? "true" : "false"); }
  function msg(sel, text) { const el = qs(sel); if (el) { el.textContent = text || ""; el.hidden = !text; } else if (text) { alert(text); } }
  async function createPost({ title, body, mediaUrl, tags }) {
    const token = getToken();
    if (!token) throw new Error("not_authenticated");
    const payload = { title, body };
    if (tags && tags.length) payload.tags = tags;
    if (mediaUrl) payload.media = { url: mediaUrl, alt: title || "post media" };
    const created = await request("/social/posts", { method: "POST", body: payload, auth: true });
    const id = created?.data?.id || created?.id;
    if (!id) throw new Error("Missing post id");
    await retryGet(`/social/posts/${encodeURIComponent(id)}`, 3, 250, true);
    return id;
  }
  document.addEventListener("DOMContentLoaded", () => {
    const form = qs("#new-post-form") || qs("form[data-form='new-post']") || qs("form.new-post");
    const submitBtn = form ? form.querySelector("[type=submit]") : null;
    const redirectPref = form?.dataset.redirect || "";
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg("#form-error", "");
      msg("#form-success", "");
      const title = val(field("title", "title"));
      const body = val(field("body", "body"));
      const mediaUrl = val(field("media", "media"));
      const tags = tagsFrom(val(field("tags", "tags")));
      if (!title || !body) { msg("#form-error", "Title and content are required."); return; }
      busy(submitBtn, true);
      try {
        const id = await createPost({ title, body, mediaUrl, tags });
        try { sessionStorage.setItem("lastCreatedPostId", String(id)); } catch {}
        const base = apiBase();
        try { sessionStorage.setItem("apiBaseUsedForCreate", base || ""); } catch {}
        if (redirectPref) { window.location.href = redirectPref.includes("?") ? `${redirectPref}&fresh=${Date.now()}` : `${redirectPref}?fresh=${Date.now()}`; return; }
        if (id) { window.location.href = `/post.html?id=${encodeURIComponent(id)}&fresh=${Date.now()}`; return; }
        window.location.href = `/feed.html?fresh=${Date.now()}`;
      } catch (err) {
        if (err?.message === "not_authenticated") {
          msg("#form-error", "You must be logged in to create a post. Redirecting to login…");
          setTimeout(() => { window.location.href = "/login.html"; }, 600);
        } else {
          msg("#form-error", String(err?.message || "Failed to publish."));
        }
      } finally {
        busy(submitBtn, false);
      }
    });
  });
})();



