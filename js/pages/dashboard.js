import { requireLogin } from "../auth.js";
import { dashboardApi } from "../api.js";
import { setupPage, showMessage, showLoading, emptyState } from "../ui.js";
import { el, money, dateTime, timeAgo } from "../utils.js";

if (!requireLogin()) throw new Error("Login required");
const content = setupPage("dashboard", "Dashboard");
content.append(el("div", { class: "page-heading" }, [el("div", {}, [el("h2", { text: "Your property business at a glance" }), el("p", { text: "New enquiries, listings, and customer activity." })]), el("a", { href: "property-form.html", class: "button button-primary", text: "Add property" })]));
const cards = el("section", { class: "grid grid-5", id: "stats" }); content.append(cards);
const latest = el("section", { class: "card", style: "margin-top:18px" }); content.append(latest);
showLoading(cards, "Loading dashboard…");
try {
  const data = await dashboardApi();
  const values = [["New queries", data.new_queries, "queries.html?status=new"], ["Resolved queries", data.resolved_queries, "queries.html?status=resolved"], ["Available properties", data.available_properties, "properties.html?status=available"], ["Sold properties", data.sold_properties, "properties.html?status=sold"], ["Customers", data.total_customers, "customers.html"]];
  cards.replaceChildren(...values.map(([label, value, href]) => { const card = el("a", { href, class: "stat-card" }); card.append(el("div", { class: "stat-label", text: label }), el("div", { class: "stat-value", text: value ?? "Unavailable" })); return card; }));
  const avgHours = Math.round((data.average_resolution_seconds || 0) / 3600 * 10) / 10;
  latest.append(el("div", { class: "card-head" }, [el("h2", { text: "Latest new queries" }), el("a", { href: "queries.html?status=new", text: "View all" })]));
  latest.append(el("p", { class: "muted", text: `Average resolution time: ${avgHours} hours` }));
  if (data.latest_new_queries === null) latest.append(emptyState("Latest queries are unavailable."));
  else if (!data.latest_new_queries?.length) latest.append(emptyState("No new queries right now."));
  else {
    const table = el("div", { class: "table-wrap" }); const body = el("tbody");
    data.latest_new_queries.forEach(item => { const row = el("tr", { onclick: () => { window.location.href = `query-detail.html?id=${item.id}`; } }); row.append(el("td", { text: item.customer?.name || "Customer" }), el("td", { text: item.property?.title || "General query" }), el("td", { text: item.message || "No message" }), el("td", { text: timeAgo(item.raised_at) })); body.append(row); });
   const tableEl = el("table"); tableEl.append(el("thead", {}, [el("tr", {}, ["Customer", "Property", "Message", "Received"].map(text => el("th", { text })))]), body); table.append(tableEl); latest.append(table);
  }
} catch (error) { cards.replaceChildren(emptyState("Dashboard data is unavailable. Refresh to try again.")); latest.replaceChildren(); showMessage("error", error.message); }
