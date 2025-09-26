import { API_AUTH_REGISTER, apiFetch } from "../api.js";

const form =
  document.querySelector("#register") ||
  document.querySelector("#registerForm") ||
  document.querySelector("form");

const emailInput =
  form.querySelector("#email") ||
  form.querySelector("[name=email]") ||
  form.querySelector("input[type=email]");

const passwordInput =
  form.querySelector("#password") ||
  form.querySelector("[name=password]") ||
  form.querySelector("input[type=password]");

const nameInput =
  form.querySelector("#name") ||
  form.querySelector("[name=name]");

const submitBtn =
  form.querySelector("[type=submit]") ||
  form.querySelector("button");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput?.value?.trim();
  const password = passwordInput?.value || "";
  const name = nameInput?.value?.trim();

  if (!email || !password || !name) {
    alert("Please fill name, email and password.");
    return;
  }

  submitBtn?.setAttribute("disabled", "true");
  if (submitBtn) submitBtn.textContent = "Creating account…";

  try {
    await apiFetch(API_AUTH_REGISTER, {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    // Etter registrering: send til login, forhåndsfyll e-post via query
    const q = new URLSearchParams({ email });
    window.location.href = `./login.html?${q.toString()}`;
  } catch (err) {
    console.error(err);
    alert(err?.message || "Registration failed");
  } finally {
    submitBtn?.removeAttribute("disabled");
    if (submitBtn) submitBtn.textContent = "Register";
  }
});
