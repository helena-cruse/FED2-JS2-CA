(function () {
  const API_BASE = "https://v2.api.noroff.dev";
  function getToken() {
    try { if (typeof window.getToken === "function") { const t = window.getToken(); if (t && (t.accessToken || t.token)) return t.accessToken || t.token; } } catch {}
    try { if (typeof window.getAuth === "function") { const a = window.getAuth(); if (a && (a.accessToken || a.token)) return a.accessToken || a.token; } } catch {}
    try { const a = JSON.parse(localStorage.getItem("auth") || "{}"); if (a && (a.accessToken || a.token)) return a.accessToken || a.token; } catch {}
    try { const t = localStorage.getItem("accessToken") || localStorage.getItem("token"); if (t) return t; } catch {}
    return null;
  }
  function qs(sel, root = document) { return root.querySelector(sel); }
  function getField(name, fallbackId) {
    return qs(`[name="${name}"]`) || (fallbackId ? qs(`#${fallbackId}`) : null);
  }
  function getText(el) { return (el && typeof el.value === "string") ? el.value.trim() : ""; }
  function parseTags(raw) {
    return (raw || "")
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);
  }
  function setBusy(el, busy) { if (!el) return; el.disabled = !!busy; el.setAttribute("aria-busy", busy ? "true" : "false"); }
  function showMessage(id, text) { const box = qs(id); if (box) { box.textContent = text; box.hidden = !text; } else if (text) { alert(text); } }
  async function createPost({ title, body, mediaUrl, tags }) {
    const token = getToken();
    if (!token) throw new Error("not_authenticated");
    const payload = { title, body };
    if (tags && tags.length) payload.tags = tags;
    if (mediaUrl) payload.media = { url: mediaUrl, alt: title || "post media" };
    const res = await fetch(`${API_BASE}/social/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = (data && (data.errors?.[0]?.message || data.message)) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return res.json();
  }
  document.addEventListener("DOMContentLoaded", () => {
    const form = qs("#new-post-form") || qs("form[data-form='new-post']") || qs("form.new-post");
    const submitBtn = form ? form.querySelector("[type=submit]") : null;
    const redirectTo = form?.dataset.redirect || "/feed.html";
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
        const data = await createPost({ title, body, mediaUrl, tags });
        showMessage("#form-success", "Post published.");
        const to = form?.dataset.redirect || redirectTo || "";
        if (to) window.location.href = to;
        else if (data?.data?.id) window.location.href = `/post.html?id=${encodeURIComponent(data.data.id)}`;
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
