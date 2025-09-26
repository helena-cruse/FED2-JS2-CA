import { API_AUTH_LOGIN, apiFetch } from "../api.js";

const form =
  document.querySelector("#login") ||
  document.querySelector("#loginForm") ||
  document.querySelector("form");

const emailInput =
  form.querySelector("#email") ||
  form.querySelector("[name=email]") ||
  form.querySelector("input[type=email]");

const passwordInput =
  form.querySelector("#password") ||
  form.querySelector("[name=password]") ||
  form.querySelector("input[type=password]");

const submitBtn =
  form.querySelector("[type=submit]") ||
  form.querySelector("button");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput?.value?.trim();
  const password = passwordInput?.value || "";
  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  submitBtn?.setAttribute("disabled", "true");
  if (submitBtn) submitBtn.textContent = "Logging in…";

  try {
    const payload = await apiFetch(API_AUTH_LOGIN, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const accessToken = payload?.accessToken;
    if (!accessToken) throw new Error("Missing accessToken from response");

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify({ ...payload, accessToken }));

    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect") || "../profile/index.html";
    window.location.href = redirect;
  } catch (err) {
    console.error(err);
    alert(err?.message || "Login failed");
  } finally {
    submitBtn?.removeAttribute("disabled");
    if (submitBtn) submitBtn.textContent = "Login";
  }
});
