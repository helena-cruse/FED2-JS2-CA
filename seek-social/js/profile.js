import { fetchJson, getToken } from "./api.js";

const whoEl = document.getElementById("who");
const listEl = document.getElementById("myPosts");
const loadMoreBtn = document.getElementById("loadMore");

const state = { name: null, limit: 20, offset: 0, hasMore: true, isLoading: false };

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

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return ""; }
}

function getPrimaryMedia(p) {
  const m = p?.media;
  if (!m) return null;
  if (Array.isArray(m) && m[0]?.url) return { url: m[0].url, alt: m[0].alt || "" };
  if (!Array.isArray(m) && m?.url) return { url: m.url, alt: m.alt || "" };
  return null;
}

function postCard(p) {
  const media = getPrimaryMedia(p);
  const created = p.created ? fmtDate(p.created) : "";
  const text = p.body ?? "";
  const preview = text.slice(0, 160);
  const reactions = p._count?.reactions ?? 0;
  const comments = p._count?.comments ?? 0;

  return `
    <article class="card" data-id="${p.id}">
      ${media ? `<img class="thumb" src="${media.url}" alt="${media.alt}" loading="lazy">` : ""}
      <h3 class="title">${p.title || "(untitled)"}</h3>
      <p class="meta">${created ? `Created ${created}` : ""}</p>
      ${text ? `<p class="excerpt">${preview}${text.length > 160 ? "…" : ""}</p>` : ""}

      <div class="actions">
        <span class="btn-icon" title="Reactions">👍 <span class="count">${reactions}</span></span>
        <span class="btn-icon" title="Comments">💬 <span class="count">${comments}</span></span>
        <a class="btn-link" href="../posts/single.html?id=${encodeURIComponent(p.id)}">Open</a>
        <a class="btn-link" href="../posts/edit-post.html?id=${encodeURIComponent(p.id)}">Edit</a>
        <button class="danger" data-delete="${p.id}">Delete</button>
      </div>
    </article>
  `;
}

function setLoading(b) {
  state.isLoading = b;
  loadMoreBtn.disabled = b;
  loadMoreBtn.textContent = b ? "Loading…" : "Load more";
  listEl.setAttribute("aria-busy", String(b));
}

async function loadPage({ append = false } = {}) {
  if (state.isLoading) return;
  if (!append) {
    state.offset = 0;
    state.hasMore = true;
    listEl.innerHTML = "";
  }
  if (!state.hasMore) return;

  setLoading(true);

  const params = new URLSearchParams({
    limit: String(state.limit),
    offset: String(state.offset),
    sort: "created",
    sortOrder: "desc",
    _author: "true",
    _reactions: "true",
    _comments: "true",
  });

  try {
    const path = `/social/profiles/${encodeURIComponent(state.name)}/posts?${params.toString()}`;
    const items = await fetchJson(path);
    const list = Array.isArray(items) ? items : [];

    if (!append && list.length === 0) {
      listEl.innerHTML = `<p>You haven’t posted anything yet.</p>`;
    } else {
      listEl.insertAdjacentHTML("beforeend", list.map(postCard).join(""));
    }

    state.offset += list.length;
    state.hasMore = list.length === state.limit;
    loadMoreBtn.hidden = !state.hasMore;
  } catch (err) {
    console.error(err);
    if (err?.status === 401 || /authorization/i.test(err?.message || "")) {
      const redirect = encodeURIComponent("/profile/index.html");
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    listEl.innerHTML = `<p class="error">Failed to load your posts: ${err.message || "Unknown error"}</p>`;
    state.hasMore = false;
    loadMoreBtn.hidden = true;
  } finally {
    setLoading(false);
  }
}

async function handleDelete(id, cardEl) {
  if (!confirm("Delete this post? This cannot be undone.")) return;

  const btn = cardEl.querySelector('button[data-delete]');
  if (btn) btn.disabled = true;

  try {
    await fetchJson(`/social/posts/${id}`, { method: "DELETE" });
    cardEl.remove();
    if (!listEl.querySelector("[data-id]")) {
      listEl.innerHTML = `<p>You haven’t posted anything yet.</p>`;
    }
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      const redirect = encodeURIComponent("/profile/index.html");
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    alert(err?.message || "Failed to delete post.");
    if (btn) btn.disabled = false;
  }
}

loadMoreBtn.addEventListener("click", () => loadPage({ append: true }));

listEl.addEventListener("click", (e) => {
  const delBtn = e.target.closest("button[data-delete]");
  if (!delBtn) return;
  const card = delBtn.closest("[data-id]");
  const id = card?.dataset?.id;
  if (!id) return;
  handleDelete(id, card);
});

(function init() {
  const name = decodeNameFromToken();
  if (!name) {
    const redirect = encodeURIComponent("/profile/index.html");
    window.location.href = `../auth/login.html?redirect=${redirect}`;
    return;
  }
  state.name = name;
  whoEl.textContent = `Logged in as ${name}`;
  loadPage();
})();
