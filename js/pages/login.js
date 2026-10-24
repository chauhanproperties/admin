import { authApi, api } from "../api.js?v=3";
import { saveToken, getToken } from "../auth.js";

const notice = document.querySelector("#login-notice");
const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const message = (kind, text) => { notice.replaceChildren(); const box = document.createElement("div"); box.className = `banner ${kind}`; box.textContent = text; notice.append(box); };

if (getToken()) {
  try { await api("/api/admin/auth/me"); window.location.replace("dashboard.html"); }
  catch { localStorage.removeItem("chauhanPropertiesToken"); }
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type=submit]"); button.disabled = true;
  try {
    const result = await authApi.login(emailInput.value.trim(), passwordInput.value);
    saveToken(result.access_token); window.location.replace("dashboard.html");
  } catch (error) { message("error", error.message); }
  finally { button.disabled = false; }
});
