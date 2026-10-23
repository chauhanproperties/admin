import { el } from "./utils.js";
import { logout } from "./auth.js";

export function setupPage(active, title) {
  document.title = `${title} · Chauhan Properties`;
  const root = document.querySelector("#app");
  const nav = [["dashboard.html", "Dashboard", "dashboard"], ["properties.html", "Properties", "properties"], ["queries.html", "Queries", "queries"], ["customers.html", "Customers", "customers"]];
  root.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="dashboard.html"><span class="brand-mark">CP</span><span>Chauhan<br>Properties</span></a><nav id="main-nav"></nav><div class="sidebar-foot">Admin workspace</div></aside><section class="workspace"><header class="topbar"><button id="menu-toggle" class="icon-button" aria-label="Toggle menu">☰</button><h1>${title}</h1><button id="logout" class="button button-light">Log out</button></header><main id="content" class="content"><div id="notice" aria-live="polite"></div></main></section></div>`;
  const navNode = root.querySelector("#main-nav");
  nav.forEach(([href, label, key]) => navNode.append(el("a", { href, class: key === active ? "nav-link active" : "nav-link", text: label })));
  root.querySelector("#logout").addEventListener("click", logout);
  root.querySelector("#menu-toggle").addEventListener("click", () => root.querySelector(".shell").classList.toggle("menu-open"));
  window.addEventListener("api:waking", () => showMessage("info", "The server is waking up. This can take up to a minute."));
  return root.querySelector("#content");
}
export function showMessage(type, message) {
  const host = document.querySelector("#notice");
  if (!host) return;
  host.replaceChildren(el("div", { class: `banner ${type}`, text: message }));
  if (type !== "error") setTimeout(() => host.replaceChildren(), 6000);
}
export function showLoading(container, message = "Loading…") { container.replaceChildren(el("p", { class: "muted", text: message })); }
export function emptyState(message) { return el("div", { class: "empty-state", text: message }); }
export function button(label, onClick, kind = "button-light") { return el("button", { type: "button", class: `button ${kind}`, text: label, onclick: onClick }); }
export function badge(value) { return el("span", { class: `badge ${value}`, text: value }); }
export function pagination(host, page, pageSize, total, onPage) {
  const bar = el("div", { class: "pagination" });
  bar.append(el("span", { class: "muted", text: `${total ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, total)} of ${total}` }));
  const prev = button("Previous", () => onPage(page - 1)); prev.disabled = page <= 1;
  const next = button("Next", () => onPage(page + 1)); next.disabled = page * pageSize >= total;
  bar.append(prev, el("span", { class: "page-number", text: String(page) }), next); host.append(bar);
}
export function confirmAction(message) { return window.confirm(message); }
