import { fetchJson } from "./api.js";

const form = document.getElementById("postForm");
const titleEl = document.getElementById("title");
const bodyEl = document.getElementById("body");
const mediaUrlEl = document.getElementById("mediaUrl");
const mediaAltEl = document.getElementById("mediaAlt");
const tagsEl = document.getElementById("tags");
const errorEl = document.getElementById("formError");
const createBtn = document.getElementById("createBtn");

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = !msg;
}

function parseTags(str) {
  return (str || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
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
    ...(body ? { body } : {}),
    ...(tags.length ? { tags } : {}),
    ...(mediaUrl ? { media: { url: mediaUrl, alt: mediaAlt || "" } } : {}),
  };

  createBtn.disabled = true;

  try {
    const created = await fetchJson("/social/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const id = created?.id ?? created?.data?.id;
    if (id == null) throw new Error("Missing post id from server.");

    window.location.href = `./single.html?id=${encodeURIComponent(id)}`;
  } catch (err) {
    console.error(err);
    if (err?.status === 401 || /authorization/i.test(err?.message || "")) {
      const redirect = encodeURIComponent("/posts/new-post.html");
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    showError(err?.message || "Failed to create post.");
  } finally {
    createBtn.disabled = false;
  }
});
