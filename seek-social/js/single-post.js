import { fetchJson, getToken } from "./api.js";

const postEl = document.getElementById("post");
const commentsList = document.getElementById("comments");
const commentForm = document.getElementById("commentForm");
const commentBody = document.getElementById("commentBody");

const params = new URLSearchParams(location.search);
const id = params.get("id");
if (!id) {
  postEl.innerHTML = `<p class="error">Missing post id in URL.</p>`;
  throw new Error("Missing id");
}

function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return ""; } }

function getPrimaryMedia(p) {
  const m = p?.media;
  if (!m) return null;
  if (Array.isArray(m) && m[0]?.url) return { url: m[0].url, alt: m[0].alt || "" };
  if (!Array.isArray(m) && m?.url) return { url: m.url, alt: m.alt || "" };
  return null;
}

function renderPost(p) {
  const media = getPrimaryMedia(p);
  const author = p.author?.name ?? "Unknown";
  const created = p.created ? fmtDate(p.created) : "";
  const reactions = p._count?.reactions ?? 0;
  const comments = p._count?.comments ?? 0;

  const authorHtml =
    author && author !== "Unknown"
      ? `<a class="btn-link" href="../profile/user.html?name=${encodeURIComponent(author)}">${author}</a>`
      : "Unknown";

  return `
    <article class="card" data-id="${p.id}">
      ${media ? `<img class="thumb" src="${media.url}" alt="${media.alt}" loading="lazy">` : ""}
      <h1 class="title" style="margin-top:.25rem">${p.title || "(untitled)"}</h1>
      <p class="meta">by ${authorHtml}${created ? ` · ${created}` : ""}</p>
      ${p.body ? `<p style="margin:.5rem 0 0">${p.body}</p>` : ""}

      <div class="actions" style="margin-top:.75rem">
        <button type="button" class="btn-icon" id="likeBtn">
          👍 <span class="count">${reactions}</span>
        </button>
        <span class="counts" style="margin-left:.5rem">💬 ${comments}</span>
      </div>
    </article>
  `;
}

function renderComments(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    commentsList.innerHTML = `<li style="color:var(--muted)">No comments yet.</li>`;
    return;
  }
  commentsList.innerHTML = items.map(c => {
    const who = c.owner?.name ?? c.author?.name ?? "Unknown";
    const when = c.created ? fmtDate(c.created) : "";
    const body = c.body ?? "";
    return `
      <li class="card" style="padding:.7rem; margin:.5rem 0">
        <p class="meta" style="margin-bottom:.25rem"><strong>${who}</strong>${when ? ` · ${when}` : ""}</p>
        <p>${body}</p>
      </li>
    `;
  }).join("");
}

async function refreshCounts(card) {
  try {
    const p = await fetchJson(`/social/posts/${id}?_reactions=true&_comments=true`);
    const likeCountEl = card.querySelector("#likeBtn .count");
    const cmCountLabel = card.querySelector(".counts");
    const r = p?._count?.reactions ?? 0;
    const c = p?._count?.comments ?? 0;
    if (likeCountEl) likeCountEl.textContent = r;
    if (cmCountLabel) cmCountLabel.textContent = `💬 ${c}`;
  } catch (e) { console.error("refreshCounts", e); }
}

async function loadPost() {
  postEl.setAttribute("aria-busy", "true");
  try {
    const p = await fetchJson(`/social/posts/${id}?_author=true&_comments=true&_reactions=true`);
    postEl.innerHTML = renderPost(p);
    renderComments(p.comments || p._comments || []);

    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        const me = payload?.name || payload?.username || payload?.sub || null;
        if (me && p?.author?.name === me) {
          const ownerRow = document.createElement("p");
          ownerRow.style.marginTop = ".5rem";
          ownerRow.innerHTML = `<a class="btn-link" href="./edit-post.html?id=${encodeURIComponent(p.id)}">Edit post</a>`;
          postEl.querySelector("article")?.appendChild(ownerRow);
        }
      }
    } catch { /* ignore parse issues */ }

  } catch (err) {
    console.error(err);
    if (err?.status === 401 || /authorization/i.test(err?.message || "")) {
      const redirect = encodeURIComponent(`/posts/single.html?id=${encodeURIComponent(id)}`);
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    postEl.innerHTML = err?.status === 404
      ? `<p class="error">Post not found.</p>`
      : `<p class="error">Failed to load post: ${err.message || "Unknown error"}</p>`;
  } finally {
    postEl.setAttribute("aria-busy", "false");
  }
}

postEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("#likeBtn");
  if (!btn) return;
  const path = `/social/posts/${id}/react/${encodeURIComponent("👍")}`;
  btn.disabled = true;
  try {
    await fetchJson(path, { method: "PUT" });
    await refreshCounts(postEl);
  } catch (err) {
    console.error(err);
    alert(err?.message || "Could not react to post");
  } finally { btn.disabled = false; }
});

commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = commentBody.value.trim();
  if (!text) return;

  const submit = commentForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await fetchJson(`/social/posts/${id}/comment`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    });
    commentBody.value = "";
    await loadPost();
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      const redirect = encodeURIComponent(`/posts/single.html?id=${encodeURIComponent(id)}`);
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    alert(err?.message || "Could not publish comment");
  } finally { submit.disabled = false; }
});

loadPost();
