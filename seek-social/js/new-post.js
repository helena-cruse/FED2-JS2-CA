(function () {
  function apiRoot() {
    const a = window.api || window.API || {};
    return a.base || a.BASE_URL || a.API_BASE || "";
  }
  function getToken() {
    const a = window.api || window.API || {};
    try { if (typeof a.getToken === "function") { const t = a.getToken(); if (t) return t.accessToken || t.token || t; } } catch {}
    try { if (typeof a.getAuth === "function") { const au = a.getAuth(); if (au) return au.accessToken || au.token; } } catch {}
    try { const au = JSON.parse(localStorage.getItem("auth") || "{}"); if (au) return au.accessToken || au.token; } catch {}
    try { const t = localStorage.getItem("accessToken") || localStorage.getItem("token"); if (t) return t; } catch {}
    return null;
  }
  async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
    const a = window.api || window.API || {};
    const base = apiRoot();
    const token = auth ? getToken() : null;
    if (typeof a.request === "function") {
      return a.request(path, { method, body, auth: auth ? true : false });
    }
    if (typeof a.authRequest === "function" && auth) {
      return a.authRequest(path, { method, body });
    }
    const url = base ? `${base}${path}` : path;
    const headers = { "Content-Type": "application/json" };
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.errors?.[0]?.message || data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }
  function qs(sel, root = document) { return root.querySelector(sel); }
  function getField(name, fallbackId) { return qs(`[name="${name}"]`) || (fallbackId ? qs(`#${fallbackId}`) : null); }
  function getText(el) { return (el && typeof el.value === "string") ? el.value.trim() : ""; }
  function parseTags(raw) { return (raw || "").split(",").map(t => t.trim()).filter(Boolean); }
  function setBusy(el, busy) { if (!el) return; el.disabled = !!busy; el.setAttribute("aria-busy", busy ? "true" : "false"); }
  function showMessage(id, text) { const box = qs(id); if (box) { box.textContent = text; box.hidden = !text; } else if (text) { alert(text); } }

  async function createPost({ title, body, mediaUrl, tags }) {
    const token = getToken();
    if (!token) throw new Error("not_authenticated");
    const payload = { title, body };
    if (tags && tags.length) payload.tags = tags;
    if (mediaUrl) payload.media = { url: mediaUrl, alt: title || "post media" };
    const created = await apiRequest("/social/posts", { method: "POST", body: payload, auth: true });
    const id = created?.data?.id || created?.id;
    if (id) await apiRequest(`/social/posts/${encodeURIComponent(id)}`, { auth: true });
    return id;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = qs("#new-post-form") || qs("form[data-form='new-post']") || qs("form.new-post");
    const submitBtn = form ? form.querySelector("[type=submit]") : null;
    const fallbackRedirect = form?.dataset.redirect || "/feed.html";
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showMessage("#form-error", "");
      showMessage("#form-success", "");

      const title = getText(getField("title", "title"));
      const body = getText(getField("body", "body"));
      const mediaUrl = getText(getField("media", "media"));
      const rawTags = getText(getField("tags", "tags"));
      const tags = parseTags(rawTags);

      if (!title || !body) { showMessage("#form-error", "Title and content are required."); return; }

      setBusy(submitBtn, true);
      try {
        const id = await createPost({ title, body, mediaUrl, tags });
        if (id) {
          window.location.href = `/post.html?id=${encodeURIComponent(id)}`;
          return;
        }
        window.location.href = `${fallbackRedirect}?fresh=${Date.now()}`;
      } catch (err) {
        if (err && err.message === "not_authenticated") {
          showMessage("#form-error", "You must be logged in to create a post. Redirecting to login…");
          setTimeout(() => { window.location.href = "/login.html"; }, 600);
        } else {
          showMessage("#form-error", String(err?.message || "Something went wrong while publishing."));
        }
      } finally {
        setBusy(submitBtn, false);
      }
    });
  });
})();


