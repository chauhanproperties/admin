const TOKEN_KEY = "chauhanPropertiesToken";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function saveToken(token) { localStorage.setItem(TOKEN_KEY, token); }
export function logout() { localStorage.removeItem(TOKEN_KEY); window.location.href = "index.html"; }
export function requireLogin() {
  if (!getToken()) { window.location.replace("index.html"); return false; }
  return true;
}
