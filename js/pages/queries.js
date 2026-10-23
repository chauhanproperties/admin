import { requireLogin } from "../auth.js";
import { queryApi } from "../api.js";
import { setupPage, showMessage, showLoading, emptyState, button, badge, pagination } from "../ui.js";
import { el, dateTime, pageParams } from "../utils.js";

if (!requireLogin()) throw new Error("Login required");
const content = setupPage("queries", "Queries");
content.append(el("div", { class: "page-heading" }, [el("div", {}, [el("h2", { text: "Customer queries" }), el("p", { text: "Follow up, reply, and resolve enquiries." })])]));
const stats = el("section", { class: "grid grid-3", style: "margin-bottom:18px" }); content.append(stats);
const toolbar = el("div", { class: "toolbar" }); content.append(toolbar);
function field(label, type = "text", placeholder = "") { const wrap = el("div", { class: "field" }); wrap.append(el("label", { text: label })); const input = el("input", { type, placeholder }); wrap.append(input); return [wrap, input]; }
const status = el("select"); [["", "All statuses"], ["new", "New"], ["resolved", "Resolved"]].forEach(([v, t]) => status.append(el("option", { value: v, text: t }))); status.value = pageParams().get("status") || "";
const sw = el("div", { class: "field" }); sw.append(el("label", { text: "Status" }), status);
const [searchWrap, search] = field("Customer name or phone", "search", "Search");
const [fromWrap, from] = field("Raised from", "date"); const [toWrap, to] = field("Raised to", "date");
const [propWrap, propId] = field("Property ID", "number", "Any property"); propId.min = "1";
toolbar.append(sw, fromWrap, toWrap, propWrap, searchWrap); const host = el("div"); content.append(host); let page = 1;
async function load() {
  showLoading(host);
  const params = { page, page_size: 20, sort: "newest" };
  if (status.value) params.status = status.value; if (search.value.trim()) params.search = search.value.trim(); if (propId.value) params.property_id = propId.value;
  if (from.value) params.date_from = `${from.value}T00:00:00`; if (to.value) params.date_to = `${to.value}T23:59:59`;
  try {
    const [data, stat] = await Promise.all([queryApi.list(params), queryApi.stats()]);
    stats.replaceChildren(...[["New", stat.new], ["Resolved", stat.resolved], ["Average resolution", `${Math.round((stat.average_resolution_seconds || 0) / 3600 * 10) / 10} hours`]].map(([label, value]) => el("div", { class: "stat-card" }, [el("div", { class: "stat-label", text: label }), el("div", { class: "stat-value", text: value })])));
    if (!data.items.length) { host.replaceChildren(emptyState("No queries found.")); return; }
    const wrap = el("div", { class: "table-wrap" }), table = el("table"), body = el("tbody");
    table.append(el("thead", {}, [el("tr", {}, ["Customer", "Phone", "Property", "Message", "Status", "Raised", "Resolved", "Action"].map(x => el("th", { text: x }))]), body]);
    data.items.forEach(item => { const row = el("tr", { class: item.status === "new" ? "query-new" : "" }); row.append(el("td", { text: item.customer?.name }), el("td", { text: item.customer?.phone }), el("td", { text: item.property?.title || "General query" }), el("td", { text: item.message || "—" }), el("td", {}, [badge(item.status)]), el("td", { text: dateTime(item.raised_at) }), el("td", { text: dateTime(item.resolved_at) })); const action = el("a", { class: "button button-light button-small", href: `query-detail.html?id=${item.id}`, text: "Open" }); row.append(el("td", {}, [action])); body.append(row); });
    wrap.append(table); host.replaceChildren(wrap); pagination(host, data.page, data.page_size, data.total, next => { page = next; load(); });
  } catch (error) { host.replaceChildren(emptyState("Could not load queries.")); showMessage("error", error.message); }
}
for (const input of [status, from, to, propId]) input.addEventListener("change", () => { page = 1; load(); }); let timer; search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { page = 1; load(); }, 250); }); load();
