import { fetchJson, getToken } from "./api.js";

function parseTags(raw) {
  return String(raw || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
}

function setBusy(btn, busy) {
  if (btn) btn.disabled = !!busy;
  document.body.setAttribute("aria-busy", busy ? "true" : "false");
}

function show(el, text) {
  if (!el) return;
  el.textContent = text || "";
  el.hidden = !text;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("new-post-form") || document.querySelector("form.new-post");
  const submitBtn = form ? form.querySelector('[type="submit"]') : null;
  const okBox = document.getElementById("form-success");
  const errBox = document.getElementById("form-error");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    show(okBox, "");
    show(errBox, "");

    const token = getToken();
    if (!token) {
      show(errBox, "You must be logged in to create a post.");
      setTimeout(() => { window.location.href = "../auth/login.html"; }, 500);
      return;
    }

    const fd = new FormData(form);
    const title = (fd.get("title") || "").toString().trim();
    const body = (fd.get("body") || "").toString().trim();
    const mediaUrl = (fd.get("media") || "").toString().trim();
    const tags = parseTags(fd.get("tags"));

    if (!title || !body) {
      show(errBox, "Title and content are required.");
      return;
    }

    const payload = { title, body };
    if (tags.length) payload.tags = tags;
    if (mediaUrl) payload.media = { url: mediaUrl, alt: title || "post media" };

    setBusy(submitBtn, true);
    try {
      const res = await fetchJson("/social/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const created = res?.data || res || {};
      const id = created?.id;
      show(okBox, "Post published.");
      if (id) {
        window.location.href = `./single.html?id=${encodeURIComponent(id)}&fresh=${Date.now()}`;
      } else {
        window.location.href = `../profile/index.html?fresh=${Date.now()}`;
      }
    } catch (err) {
      show(errBox, err?.message || "Something went wrong while publishing.");
    } finally {
      setBusy(submitBtn, false);
    }
  });
});


