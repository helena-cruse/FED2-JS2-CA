const TOKEN_KEY = "seeksocial_token";
const NAME_KEY = "seeksocial_name";
const EMAIL_KEY = "seeksocial_email";

export function saveAuth({ accessToken, name, email }) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (name) localStorage.setItem(NAME_KEY, name);
  if (email) localStorage.setItem(EMAIL_KEY, email);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getName() {
  return localStorage.getItem(NAME_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(EMAIL_KEY);
}
