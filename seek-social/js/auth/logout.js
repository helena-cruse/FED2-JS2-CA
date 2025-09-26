export function doLogout(redirectTo = "../auth/login.html") {
    const keys = ["accessToken", "token", "user", "auth", "profile", "account", "data"];
    keys.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
      try { sessionStorage.removeItem(k); } catch {}
    });
    window.location.href = redirectTo;
  }
  
  document.getElementById("logoutBtn")?.addEventListener("click", () => doLogout());
  