// seek-social/js/edit-post.js
import { fetchJson, getToken } from "./api.js";

const form = document.getElementById("postForm");
const titleEl = document.getElementById("title");
const bodyEl = document.getElementById("body");
const mediaUrlEl = document.getElementById("mediaUrl");
const mediaAltEl = document.getElementById("mediaAlt");
const tagsEl = document.getElementById("tags");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const errorEl = document.getElementById("formError");
const viewLink = document.getElementById("viewLink");

const params = new URLSearchParams(location.search);
const id = params.get("id");

if (!id) {
  showError("Missing post id in URL.");
  throw new Error("Missing id");
}
viewLink.href = `./single.html?id=${encodeURIComponent(id)}`;

function showError(msg) {
  errorEl.textContent = msg || "";
  errorEl.hidden = !msg;
}

function isValidUrl(u) {
  if (!u) return true;
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

function parseTags(str) {
  return (str || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function joinTags(arr) {
  return Array.isArray(arr) ? arr.join(", ") : "";
}

function currentUserName() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.name || payload?.username || payload?.sub || null;
  } catch {
    return null;
  }
}

async function loadPost() {
  try {
    const p = await fetchJson(`/social/posts/${id}?_author=true`);
    // Eier-sjekk: kun eier kan redigere/slette
    const me = currentUserName();
    if (!me) {
      const redirect = encodeURIComponent(`/posts/edit-post.html?id=${encodeURIComponent(id)}`);
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    if (p?.author?.name && p.author.name !== me) {
      form.innerHTML = `<p class="error">You can only edit your own posts.</p>
                        <p><a class="btn-link" href="./single.html?id=${encodeURIComponent(id)}">Back to post</a></p>`;
      return;
    }

    // Prefill
    titleEl.value = p.title || "";
    bodyEl.value = p.body || "";
    const media = Array.isArray(p.media) ? p.media[0] : p.media;
    mediaUrlEl.value = media?.url || "";
    mediaAltEl.value = media?.alt || "";
    tagsEl.value = joinTags(p.tags || []);
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      const redirect = encodeURIComponent(`/posts/edit-post.html?id=${encodeURIComponent(id)}`);
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    showError(err?.message || "Failed to load post.");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  const title = titleEl.value.trim();
  const body = bodyEl.value.trim();
  const mediaUrl = mediaUrlEl.value.trim();
  const mediaAlt = mediaAltEl.value.trim();
  const tags = parseTags(tagsEl.value);

  if (!title) {
    showError("Title is required.");
    titleEl.focus();
    return;
  }
  if (mediaUrl && !isValidUrl(mediaUrl)) {
    showError("Image URL must be a valid http/https URL.");
    mediaUrlEl.focus();
    return;
  }

  const payload = {
    title,
    ...(body ? { body } : { body: "" }), // tillat clearing
    ...(tags.length ? { tags } : { tags: [] }),
    ...(mediaUrl ? { media: { url: mediaUrl, alt: mediaAlt || "" } } : { media: null }),
  };

  saveBtn.disabled = true;

  try {
    await fetchJson(`/social/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    // tilbake til single
    window.location.href = `./single.html?id=${encodeURIComponent(id)}`;
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      const redirect = encodeURIComponent(`/posts/edit-post.html?id=${encodeURIComponent(id)}`);
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    showError(err?.message || "Failed to update post.");
  } finally {
    saveBtn.disabled = false;
  }
});

deleteBtn.addEventListener("click", async () => {
  showError("");
  if (!confirm("Delete this post? This cannot be undone.")) return;

  deleteBtn.disabled = true;
  saveBtn.disabled = true;

  try {
    await fetchJson(`/social/posts/${id}`, { method: "DELETE" });
    // etter sletting: tilbake til feed
    window.location.href = `./index.html`;
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      const redirect = encodeURIComponent(`/posts/edit-post.html?id=${encodeURIComponent(id)}`);
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    showError(err?.message || "Failed to delete post.");
  } finally {
    deleteBtn.disabled = false;
    saveBtn.disabled = false;
  }
});

// Init
loadPost();
