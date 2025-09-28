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
    const res = await fetchJson(`/social/posts/${id}?_reactions=true&_comments=true&fresh=${Date.now()}`);
    const p = res?.data || res || {};
    const r = p?._count?.reactions ?? 0;
    const c = p?._count?.comments ?? 0;
    const [likeCountEl, commentCountEl] = card.querySelectorAll(".btn-icon .count");
    if (likeCountEl) likeCountEl.textContent = r;
    if (commentCountEl) commentCountEl.textContent = c;
  } catch (e) {
    console.error("refreshCounts",
