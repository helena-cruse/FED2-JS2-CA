// /js/navbar.js  — vanilla JS, robust paths + robust token lookup
(function () {
    const MOUNT_ID = "site-header";
  
    // 1) Figure out project root (works from /, /seek-social/, /seek-social/posts/, etc.)
    function getProjectRoot() {
      const p = location.pathname;                         // e.g. /FED2-JS2-CA/seek-social/posts/index.html
      const hit = p.indexOf("/seek-social/");              // your folder name in the screenshot
      if (hit !== -1) return p.slice(0, hit + "/seek-social/".length); // => "/FED2-JS2-CA/seek-social/"
      // fallback: assume current folder is project root
      return (p.endsWith("/") ? p : p.replace(/[^/]+$/, ""));          // strip file if any
    }
    const ROOT = getProjectRoot();
  
    // 2) Has token? Try your storage.js first, then common fallbacks
    function getTokenLike() {
      try {
        // If your storage.js exposes getToken(), prefer that
        if (typeof window.getToken === "function") {
          const t = window.getToken();
          if (t && (t.accessToken || t.token)) return t.accessToken || t.token;
        }
        // If it exposes getAuth() or similar:
        if (typeof window.getAuth === "function") {
          const a = window.getAuth();
          if (a && (a.accessToken || a.token)) return a.accessToken || a.token;
        }
      } catch (e) {}
  
      // Fallbacks: check common keys
      const direct = localStorage.getItem("accessToken") || localStorage.getItem("token");
      if (direct) return direct;
  
      const auth = localStorage.getItem("auth");
      if (auth) {
        try {
          const o = JSON.parse(auth);
          return o?.accessToken || o?.token || null;
        } catch {}
      }
      const profile = localStorage.getItem("profile");
      if (profile) {
        try {
          const o = JSON.parse(profile);
          return o?.accessToken || o?.token || null;
        } catch {}
      }
      return null;
    }
    const token = getTokenLike();
  
    // 3) Build links using ROOT (no more broken links)
    const LINKS_AUTH = [
      { href: ROOT + "index.html",         label: "Home",      key: "home" },
      { href: ROOT + "posts/index.html",   label: "Feed",      key: "feed" },
      { href: ROOT + "profile/index.html", label: "My Profile",key: "profile" },
    ];
    const LINKS_ANON = [
      { href: ROOT + "auth/login.html",    label: "Login",     key: "login" },
      { href: ROOT + "auth/register.html", label: "Register",  key: "register" },
    ];
  
    function isActive(href) {
      // normalize for comparison
      const here = new URL(location.href);
      const there = new URL(href, location.origin);
      return here.pathname.replace(/\/+$/, "") === there.pathname.replace(/\/+$/, "");
    }
  
    function renderNavbar() {
      const mount = document.getElementById(MOUNT_ID);
      if (!mount) return;
  
      const userLinks = token ? LINKS_AUTH : LINKS_ANON;
  
      mount.innerHTML = `
        <header class="ss-header">
          <div class="ss-nav container">
            <a class="ss-brand" href="${ROOT}index.html" aria-label="Seek-Social Home">
              <img src="${ROOT}media/app-logo.png" alt="" class="ss-logo"/>
              <span class="ss-brand-text"><strong>Seek</strong> Social</span>
            </a>
  
            <button class="ss-burger" aria-label="Toggle menu" aria-expanded="false">
              <span></span>
            </button>
  
            <nav class="ss-links" data-state="closed">
              ${userLinks.map(l => `
                <a class="ss-link ${isActive(l.href) ? "active" : ""}" href="${l.href}">${l.label}</a>
              `).join("")}
              ${token ? `<button class="ss-logout" type="button">Logout</button>` : ""}
            </nav>
          </div>
        </header>
      `;
  
      // Burger toggle
      const burger = mount.querySelector(".ss-burger");
      const nav = mount.querySelector(".ss-links");
      burger.addEventListener("click", () => {
        const open = nav.getAttribute("data-state") === "open";
        nav.setAttribute("data-state", open ? "closed" : "open");
        burger.setAttribute("aria-expanded", String(!open));
      });
  
      // Logout
      const logoutBtn = mount.querySelector(".ss-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
          // Try to use your storage helpers if present
          try { window.clearAuth?.(); } catch(e) {}
          // Hard fallbacks:
          localStorage.removeItem("accessToken");
          localStorage.removeItem("token");
          localStorage.removeItem("auth");
          localStorage.removeItem("profile");
          location.href = ROOT + "auth/login.html";
        });
      }
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", renderNavbar);
    } else {
      renderNavbar();
    }
  })();
  