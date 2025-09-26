// seek-social/js/profile-user.js
import { fetchJson, getToken } from "./api.js";

const pageTitle   = document.getElementById("pageTitle");
const headerEl    = document.getElementById("header");       // <section id="header">
const postsEl     = document.getElementById("userPosts");    // <div id="userPosts">
const loadMoreBtn = document.getElementById("loadMore");     // <button id="loadMore">

const params   = new URLSearchParams(location.search);
const username = params.get("name");

const state = {
  name: username,
  me: null,
  limit: 20,
  offset: 0,
  hasMore: true,
  isLoading: false,
  followers: [],   // ← nytt
};

function decodeMe() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.name || payload?.username || payload?.sub || null;
  } catch {
    return null;
  }
}

function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return ""; } }

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
  const comments  = p._count?.comments ?? 0;

  return `
    <article class="card" data-id="${p.id}">
      ${media ? `<img class="thumb" src="${media.url}" alt="${media.alt}" loading="lazy">` : ""}
      <h3 class="title">${p.title || "(untitled)"}</h3>
      <p class="meta">${created ? `Created ${created}` : ""}</p>
      ${text ? `<p class="excerpt">${preview}${text.length > 160 ? "…" : ""}</p>` : ""}
      <div class="actions">
        <span class="btn-icon">👍 <span class="count">${reactions}</span></span>
        <span class="btn-icon">💬 <span class="count">${comments}</span></span>
        <a class="btn-link" href="../posts/single.html?id=${encodeURIComponent(p.id)}">Open</a>
      </div>
    </article>
  `;
}

function setLoading(b) {
  state.isLoading = b;
  loadMoreBtn.disabled = b;
  loadMoreBtn.textContent = b ? "Loading…" : "Load more";
  postsEl.setAttribute("aria-busy", String(b));
}

function renderFollowersPanel() {
  // Bygg panel kun hvis vi har en container i header (vi lager den like under).
  const panel = headerEl.querySelector("#followersPanel");
  if (!panel) return;

  if (!state.followers || state.followers.length === 0) {
    panel.innerHTML = `<p style="color:#666; padding:.5rem 0">No followers yet.</p>`;
    return;
  }

  panel.innerHTML = `
    <ul style="list-style:none; padding:0; margin:.5rem 0 0; display:grid; gap:.5rem">
      ${state.followers.map(f => {
        const name = f?.name || "";
        const avatar = f?.avatar?.url || "";
        return `
          <li class="card" style="padding:.5rem; display:flex; align-items:center; gap:.5rem">
            ${avatar ? `<img src="${avatar}" alt="${name} avatar" style="width:36px;height:36px;object-fit:cover;border-radius:50%">` : ""}
            <a class="btn-link" href="./user.html?name=${encodeURIComponent(name)}">${name}</a>
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function renderHeader(profile, isFollowing) {
  const avatar    = profile?.avatar?.url || "";
  const banner    = profile?.banner?.url || "";
  const following = Array.isArray(profile?.following) ? profile.following.length : 0;
  const followers = Array.isArray(profile?.followers) ? profile.followers.length : 0;

  const canFollow = state.me && state.me !== state.name;
  const followBtn = canFollow
    ? `<button id="followBtn" data-following="${isFollowing ? "1" : "0"}">${isFollowing ? "Unfollow" : "Follow"}</button>`
    : "";

  // Followers-knapp vises kun hvis count > 0 (ellers er panelet tomt)
  const followersBtn = followers > 0
    ? `<button id="toggleFollowers" aria-expanded="false" style="margin-left:.5rem">Followers (${followers})</button>`
    : `<span style="margin-left:.5rem;color:#666">Followers ${followers}</span>`;

  headerEl.innerHTML = `
    <div style="display:flex; gap:1rem; align-items:center">
      ${avatar ? `<img src="${avatar}" alt="${profile?.name || ""} avatar" style="width:64px; height:64px; object-fit:cover; border-radius:50%">` : ""}
      <div style="flex:1; min-width:0">
        <h2 style="margin:0">${profile?.name || state.name}</h2>
        <p class="meta" style="margin:.25rem 0 0; display:flex; align-items:center; gap:.5rem;">
          <span>Following ${following}</span>
          ${followersBtn}
        </p>
        ${banner ? `<img src="${banner}" alt="" style="margin-top:.5rem; width:100%; max-width:560px; height:120px; object-fit:cover; border-radius:12px">` : ""}
        <div id="followersPanel" hidden></div>
      </div>
      <div style="margin-left:auto">${followBtn}</div>
    </div>
  `;

  // Render panel-innhold (hold det hidden til bruker åpner)
  renderFollowersPanel();
}

async function loadProfile() {
  if (!state.name) {
    headerEl.innerHTML = `<p class="error">Missing ?name in URL.</p>`;
    return;
  }

  try {
    const p = await fetchJson(`/social/profiles/${encodeURIComponent(state.name)}?_followers=true&_following=true`);
    if (pageTitle) pageTitle.textContent = `Profile · ${p?.name || state.name}`;

    state.followers = Array.isArray(p?.followers) ? p.followers : [];

    let isFollowing = false;
    if (state.me && state.followers.length) {
      isFollowing = state.followers.some((u) => (u?.name || u) === state.me);
    }
    renderHeader(p, isFollowing);
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      const redirect = encodeURIComponent(`/profile/user.html?name=${encodeURIComponent(state.name)}`);
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    headerEl.innerHTML = `<p class="error">Failed to load profile: ${err.message || "Unknown error"}</p>`;
  }
}

async function loadPosts({ append = false } = {}) {
  if (state.isLoading) return;
  if (!append) {
    state.offset = 0;
    state.hasMore = true;
    postsEl.innerHTML = "";
  }
  if (!state.hasMore) return;

  setLoading(true);

  const qs = new URLSearchParams({
    limit: String(state.limit),
    offset: String(state.offset),
    sort: "created",
    sortOrder: "desc",
    _author: "true",
    _reactions: "true",
    _comments: "true",
  });

  try {
    const items = await fetchJson(`/social/profiles/${encodeURIComponent(state.name)}/posts?${qs.toString()}`);
    const list = Array.isArray(items) ? items : [];

    if (!append && list.length === 0) {
      postsEl.innerHTML = `<p>No posts yet.</p>`;
    } else {
      postsEl.insertAdjacentHTML("beforeend", list.map(postCard).join(""));
    }

    state.offset += list.length;
    state.hasMore = list.length === state.limit;
    loadMoreBtn.hidden = !state.hasMore;
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      const redirect = encodeURIComponent(`/profile/user.html?name=${encodeURIComponent(state.name)}`);
      window.location.href = `../auth/login.html?redirect=${redirect}`;
      return;
    }
    postsEl.innerHTML = `<p class="error">Failed to load posts: ${err.message || "Unknown error"}</p>`;
    state.hasMore = false;
    loadMoreBtn.hidden = true;
  } finally {
    setLoading(false);
  }
}

// Følg/avfølg + toggle followers-panel
headerEl.addEventListener("click", async (e) => {
  // Toggle followers
  const toggle = e.target.closest("#toggleFollowers");
  if (toggle) {
    const panel = headerEl.querySelector("#followersPanel");
    if (panel) {
      const isOpen = !panel.hasAttribute("hidden");
      if (isOpen) {
        panel.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
      } else {
        panel.removeAttribute("hidden");
        toggle.setAttribute("aria-expanded", "true");
      }
    }
    return;
  }

  // Follow/Unfollow
  const btn = e.target.closest("#followBtn");
  if (!btn) return;

  if (!state.me) {
    const redirect = encodeURIComponent(`/profile/user.html?name=${encodeURIComponent(state.name)}`);
    window.location.href = `../auth/login.html?redirect=${redirect}`;
    return;
  }
  if (state.me === state.name) return;

  const isFollowing = btn.getAttribute("data-following") === "1";
  const base = `/social/profiles/${encodeURIComponent(state.name)}`;
  const url  = isFollowing ? `${base}/unfollow` : `${base}/follow`;

  btn.disabled = true;
  try {
    await fetchJson(url, { method: "PUT" });
    await loadProfile(); // oppdater knapp + counts + followers-lista
  } catch (err) {
    console.error(err);
    // fallback for miljø som kun har toggle via /follow
    if (isFollowing && (err.status === 404 || /not found/i.test(err.message || ""))) {
      try {
        await fetchJson(`${base}/follow`, { method: "PUT" });
        await loadProfile();
        return;
      } catch (e2) {
        console.error(e2);
      }
    }
    alert(err?.message || "Could not update follow status.");
  } finally {
    btn.disabled = false;
  }
});

loadMoreBtn.addEventListener("click", () => loadPosts({ append: true }));

(function init() {
  state.me = decodeMe();
  loadProfile();
  loadPosts();
})();
