import { fetchJson } from "./api.js";

const feedEl = document.getElementById("feed");
const form = document.getElementById("search");
const qInput = document.getElementById("q");
const loadMoreBtn = document.getElementById("loadMore");

const state = { q: "", limit: 20, offset: 0, hasMore: true, isLoading: false };

function getPrimaryMedia(p) {
  const m = p?.media;
  if (!m) return null;
  if (Array.isArray(m) && m[0]?.url) return { url: m[0].url, alt: m[0].alt || "" };
  if (!Array.isArray(m) && m?.url) return { url: m.url, alt: m.alt || "" };
  return null;
}

function postCard(p) {
  const author = p.author?.name ?? "Unknown";
  const created = p.created ? new Date(p.created).toLocaleString() : "";
  const text = p.body ?? "";
  const preview = text.slice(0, 160);
  const reactions = p._count?.reactions ?? 0;
  const comments = p._count?.comments ?? 0;
  const media = getPrimaryMedia(p);

  const authorHtml =
    author && author !== "Unknown"
      ? `<a class="btn-link" href="../profile/user.html?name=${encodeURIComponent(author)}">${author}</a>`
      : "Unknown";

  return `
    <article class="card" data-id="${p.id}">
      ${media ? `<img class="thumb" src="${media.url}" alt="${media.alt}" loading="lazy">` : ""}
      <h2 class="title">${p.title || "(untitled)"}</h2>
      <p class="meta">by ${authorHtml}${created ? ` · ${created}` : ""}</p>
      ${text ? `<p class="excerpt">${preview}${text.length > 160 ? "…" : ""}</p>` : ""}

      <div class="actions">
        <button type="button" class="btn-icon" data-like>
          👍 <span class="count">${reactions}</span>
        </button>
        <button type="button" class="btn-icon" data-toggle-comment aria-controls="c-${p.id}" aria-expanded="false">
          💬 <span class="count">${comments}</span>
        </button>
        <a class="btn-link" href="./single.html?id=${encodeURIComponent(p.id)}">Open</a>
      </div>

      <form id="c-${p.id}" class="comment-form" hidden>
        <label for="ct-${p.id}" class="sr-only">Add comment</label>
        <input id="ct-${p.id}" name="body" type="text" placeholder="Write a comment…" maxlength="280" required>
        <button type="submit">Send</button>
      </form>
    </article>
  `;
}

function setLoading(b) {
  state.isLoading = b;
  loadMoreBtn.disabled = b;
  loadMoreBtn.textContent = b ? "Loading…" : "Load more";
  feedEl.setAttribute("aria-busy", String(b));
}

async function refreshCounts(id, card) {
  try {
    const p = await fetchJson(`/social/posts/${id}?_reactions=true&_comments=true`);
    const r = p?._count?.reactions ?? 0;
    const c = p?._count?.comments ?? 0;
    const [likeCountEl, commentCountEl] = card.querySelectorAll(".btn-icon .count");
    if (likeCountEl) likeCountEl.textContent = r;
    if (commentCountEl) commentCountEl.textContent = c;
  } catch (e) {
    console.error("refreshCounts", e);
  }
}

async function loadPage({ append = false } = {}) {
  if (state.isLoading) return;
  if (!append) {
    state.offset = 0;
    state.hasMore = true;
    feedEl.innerHTML = "";
  }
  if (!state.hasMore) return;

  setLoading(true);

  const basePath = state.q ? "/social/posts/search" : "/social/posts";

  const params = new URLSearchParams({
    limit: String(state.limit),
    offset: String(state.offset),
    sort: "created",
    sortOrder: "desc",
    _author: "true",
    _reactions: "true",
    _comments: "true",
  });
  if (state.q) params.set("q", state.q);

  try {
    const items = await fetchJson(`${basePath}?${params.toString()}`);
    const list = Array.isArray(items) ? items : [];

    if (!append && list.length === 0) {
      feedEl.innerHTML = `<p>No posts found.</p>`;
    } else {
      feedEl.insertAdjacentHTML("beforeend", list.map(postCard).join(""));
    }

    state.offset += list.length;
    state.hasMore = list.length === state.limit;
    loadMoreBtn.hidden = !state.hasMore;
  } catch (err) {
    console.error(err);
    if (err?.status === 401 || /authorization/i.test(err?.message || "")) {
      const loc = encodeURIComponent("/posts/index.html");
      window.location.href = `../auth/login.html?redirect=${loc}`;
      return;
    }
    feedEl.innerHTML = `<p class="error">Failed to load posts: ${err.message || "Unknown error"}</p>`;
    state.hasMore = false;
    loadMoreBtn.hidden = true;
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  state.q = qInput.value.trim();
  loadPage({ append: false });
});

loadMoreBtn.addEventListener("click", () => loadPage({ append: true }));

feedEl.addEventListener("click", async (e) => {
  const likeBtn = e.target.closest("button[data-like]");
  const toggleBtn = e.target.closest("button[data-toggle-comment]");
  if (!likeBtn && !toggleBtn) return;

  const card = e.target.closest("[data-id]");
  const id = card?.dataset?.id;
  if (!id) return;

  if (likeBtn) {
    const path = `/social/posts/${id}/react/${encodeURIComponent("👍")}`;
    likeBtn.disabled = true;
    try {
      await fetchJson(path, { method: "PUT" });
      await refreshCounts(id, card);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Could not react to post");
    } finally {
      likeBtn.disabled = false;
    }
    return;
  }

  if (toggleBtn) {
    const form = card.querySelector(".comment-form");
    const isOpen = !form.hasAttribute("hidden");
    if (isOpen) {
      form.setAttribute("hidden", "");
      toggleBtn.setAttribute("aria-expanded", "false");
    } else {
      form.removeAttribute("hidden");
      toggleBtn.setAttribute("aria-expanded", "true");
      form.querySelector("input[name=body]")?.focus();
    }
  }
});

feedEl.addEventListener("submit", async (e) => {
  const formEl = e.target.closest(".comment-form");
  if (!formEl) return;
  e.preventDefault();

  const card = formEl.closest("[data-id]");
  const id = card?.dataset?.id;
  const input = formEl.querySelector('input[name="body"]');
  const text = input?.value?.trim();
  if (!id || !text) return;

  const btn = formEl.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try {
    await fetchJson(`/social/posts/${id}/comment`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    });
    formEl.reset();
    await refreshCounts(id, card);
  } catch (err) {
    console.error(err);
    alert(err?.message || "Could not publish comment");
  } finally {
    if (btn) btn.disabled = false;
  }
});

loadPage();
