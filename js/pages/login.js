import { authApi, api } from "../api.js";
import { saveToken, getToken } from "../auth.js";

const notice = document.querySelector("#login-notice");
const emailForm = document.querySelector("#email-form");
const codeForm = document.querySelector("#code-form");
const emailInput = document.querySelector("#email");
const codeInput = document.querySelector("#code");
const message = (kind, text) => { notice.replaceChildren(); const box = document.createElement("div"); box.className = `banner ${kind}`; box.textContent = text; notice.append(box); };

if (getToken()) {
  try { await api("/api/admin/auth/me"); window.location.replace("dashboard.html"); }
  catch { localStorage.removeItem("chauhanPropertiesToken"); }
}

emailForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = emailForm.querySelector("button[type=submit]"); button.disabled = true;
  try {
    await authApi.requestCode(emailInput.value.trim());
    message("info", "If this email is allowed, a code has been sent.");
    codeForm.classList.remove("login-hidden"); codeInput.focus(); startCooldown();
  } catch (error) { message("error", error.message); }
  finally { button.disabled = false; }
});

codeForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = codeForm.querySelector("button[type=submit]"); button.disabled = true;
  try {
    const result = await authApi.verifyCode(emailInput.value.trim(), codeInput.value.trim());
    saveToken(result.access_token); window.location.replace("dashboard.html");
  } catch (error) { message("error", error.message); }
  finally { button.disabled = false; }
});

let cooldown = 0;
function startCooldown() {
  const resend = document.querySelector("#resend-code");
  cooldown = 60; resend.disabled = true;
  const tick = () => { resend.textContent = cooldown ? `Resend code (${cooldown}s)` : "Resend code"; if (cooldown) { cooldown -= 1; setTimeout(tick, 1000); } else resend.disabled = false; };
  tick();
}
document.querySelector("#resend-code").addEventListener("click", () => emailForm.requestSubmit());
codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 8); });
