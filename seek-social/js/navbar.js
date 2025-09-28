(function () {
  const MOUNT_ID = "site-header";

  function rootPrefix() {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.length <= 1 ? "./" : "../";
  }
  const ROOT = rootPrefix();

  function getStoredToken() {
    try { if (typeof window.getToken === "function") { const t = window.getToken(); if (t && (t.accessToken || t.token)) return t.accessToken || t.token; } } catch {}
    try { if (typeof window.getAuth === "function") { const a = window.getAuth(); if (a && (a.accessToken || a.token)) return a.accessToken || a.token; } } catch {}
    try { const v = localStorage.getItem("accessToken"); if (v && v !== "null" && v !== "undefined") return v; } catch {}
    try { const v = localStorage.getItem("token"); if (v && v !== "null" && v !== "undefined") return v; } catch {}
    try { const o = JSON.parse(localStorage.getItem("auth") || "null"); if (o && (o.accessToken || o.token)) return o.accessToken || o.token; } catch {}
    try { const o = JSON.parse(localStorage.getItem("profile") || "null"); if (o && (o.accessToken || o.token)) return o.accessToken || o.token; } catch {}
    return null;
  }

  function b64urlDecode(s){ try{ let str=(s||"").replace(/-/g,"+").replace(/_/g,"/"); while(str.length%4) str+="="; return atob(str); }catch{ return ""; } }
  function parseJwtPayload(t){ try{ const p=String(t).split("."); if(p.length!==3) return null; return JSON.parse(b64urlDecode(p[1])); }catch{ return null; } }
  function isLoggedIn(){
    const tok = getStoredToken(); if (!tok) return false;
    const payload = parseJwtPayload(tok); if (!payload) return false;
    if (payload.exp) return payload.exp * 1000 > Date.now();
    return true;
  }

  function onAuthPage(){
    const path = new URL(location.href).pathname;
    return /\/auth\/(login|register)\.html$/i.test(path);
  }

  const LINKS_AUTH = [
    { href: ROOT + "index.html",         label: "Home",       key: "home" },
    { href: ROOT + "posts/index.html",   label: "Feed",       key: "feed" },
    { href: ROOT + "posts/new-post.html",label: "New Post",   key: "new" },
    { href: ROOT + "profile/index.html", label: "My profile", key: "profile" },
  ];
  const LINKS_ANON = [
    { href: ROOT + "auth/login.html",    label: "Login",      key: "login" },
    { href: ROOT + "auth/register.html", label: "Register",   key: "register" },
  ];

  function isActive(href){
    const here  = new URL(location.href);
    const there = new URL(href, location.origin);
    return here.pathname.replace(/\/+$/,"") === there.pathname.replace(/\/+$/,"");
  }

  function renderNavbar() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const logged = isLoggedIn();
    const userLinks = onAuthPage() ? LINKS_ANON : (logged ? LINKS_AUTH : LINKS_ANON);

    mount.innerHTML = `
      <header class="ss-header">
        <div class="ss-nav container">
          <a class="ss-brand" href="${ROOT}index.html" aria-label="SeekSocial Home">
            <img src="${ROOT}media/app-logo.png" alt="SeekSocial" class="ss-logo"/>
          </a>
          <button class="ss-burger" aria-label="Toggle menu" aria-expanded="false"><span></span></button>
          <nav class="ss-links" data-state="closed">
            ${userLinks.map(l => `<a class="ss-link ${isActive(l.href) ? "active" : ""}" href="${l.href}">${l.label}</a>`).join("")}
            ${(!onAuthPage() && logged) ? `<button class="ss-logout" type="button">Logout</button>` : ""}
          </nav>
        </div>
      </header>
    `;

    const burger = mount.querySelector(".ss-burger");
    const nav    = mount.querySelector(".ss-links");
    if (burger && nav) {
      burger.addEventListener("click", () => {
        const open = nav.getAttribute("data-state") === "open";
        nav.setAttribute("data-state", open ? "closed" : "open");
        burger.setAttribute("aria-expanded", String(!open));
      });
    }

    const logoutBtn = mount.querySelector(".ss-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        try { window.clearAuth?.(); } catch {}
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
  window.addEventListener("storage", renderNavbar);
  window.addEventListener("focus", renderNavbar);
  window.addEventListener("pageshow", renderNavbar);
})();
