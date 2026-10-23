import { requireLogin } from "../auth.js";
import { propertyApi } from "../api.js";
import { setupPage, showMessage, showLoading, emptyState, button, badge, pagination, confirmAction } from "../ui.js";
import { el, money, dateTime } from "../utils.js";

if (!requireLogin()) throw new Error("Login required");
const content = setupPage("properties", "Properties");
const heading = el("div", { class: "page-heading" }, [el("div", {}, [el("h2", { text: "Property listings" }), el("p", { text: "Manage plots, houses, flats, and their sale status." })]), el("a", { href: "property-form.html", class: "button button-primary", text: "Add property" })]); content.append(heading);
const toolbar = el("div", { class: "toolbar" }); content.append(toolbar);
function selectField(label, values, current = "") { const wrap = el("div", { class: "field" }); wrap.append(el("label", { text: label })); const select = el("select"); values.forEach(([v, text]) => select.append(el("option", { value: v, text, selected: v === current ? "selected" : null }))); wrap.append(select); return [wrap, select]; }
const [statusWrap, status] = selectField("Status", [["", "All statuses"], ["available", "Available"], ["sold", "Sold"]]);
const [typeWrap, type] = selectField("Type", [["", "All types"], ["plot", "Plot"], ["house", "House"], ["flat", "Flat"]]);
const initialFilters = new URLSearchParams(window.location.search);
status.value = ["available", "sold"].includes(initialFilters.get("status")) ? initialFilters.get("status") : "";
type.value = ["plot", "house", "flat"].includes(initialFilters.get("property_type")) ? initialFilters.get("property_type") : "";
const min = el("input", { type: "number", min: "0", placeholder: "Min price" }); const max = el("input", { type: "number", min: "0", placeholder: "Max price" });
const search = el("input", { type: "search", placeholder: "Title or address" });
const [sortWrap, sort] = selectField("Sort", [["newest", "Newest"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"]], "newest");
for (const [label, input] of [["Min price", min], ["Max price", max]]) { const wrap = el("div", { class: "field" }); wrap.append(el("label", { text: label }), input); toolbar.append(wrap); }
const searchWrap = el("div", { class: "field search" }); searchWrap.append(el("label", { text: "Search" }), search); toolbar.prepend(statusWrap, typeWrap); toolbar.append(searchWrap, sortWrap);
const tableHost = el("div"); content.append(tableHost);
let page = 1;
async function load() {
  showLoading(tableHost);
  const params = { page, page_size: 20, sort: sort.value };
  if (status.value) params.status = status.value; if (type.value) params.property_type = type.value;
  if (min.value) params.min_price = min.value; if (max.value) params.max_price = max.value; if (search.value.trim()) params.search = search.value.trim();
  try {
    const data = await propertyApi.list(params);
    if (!data.items.length) { tableHost.replaceChildren(emptyState("No properties found. Add your first property.")); return; }
    const wrap = el("div", { class: "table-wrap" }); const table = el("table"), body = el("tbody");
    table.append(el("thead", {}, [el("tr", {}, ["Photo", "Title", "Type", "Address", "Size", "Price", "Status", "Created", "Actions"].map(text => el("th", { text }))])), body);
    data.items.forEach(item => {
      const row = el("tr"); const image = item.images?.[0] ? el("img", { class: "thumb", src: item.images[0].image_url, alt: "Property" }) : el("span", { class: "muted", text: "—" });
      const actions = el("div", { class: "actions" });
      actions.append(el("a", { class: "button button-light button-small", href: `property-form.html?id=${item.id}`, text: "Edit" }));
      actions.append(button(item.status === "sold" ? "Mark available" : "Mark sold", () => item.status === "sold" ? changeAvailable(item) : soldDialog(item), "button-light button-small"));
      actions.append(button("Delete", () => remove(item), "button-danger button-small"));
      row.append(el("td", {}, [image]), el("td", { text: item.title }), el("td", { text: item.property_type }), el("td", { text: item.address }), el("td", { text: `${item.length} × ${item.width} ft · ${item.area} sq ft` }), el("td", { text: money(item.price) }), el("td", {}, [badge(item.status)]), el("td", { text: dateTime(item.created_at) }), el("td", {}, [actions])); body.append(row);
    });
    wrap.append(table); tableHost.replaceChildren(wrap); pagination(tableHost, data.page, data.page_size, data.total, next => { page = next; load(); });
  } catch (error) { tableHost.replaceChildren(emptyState("Could not load properties.")); showMessage("error", error.message); }
}
async function remove(item) { if (!confirmAction(`Delete “${item.title}”? Its images and building details will also be deleted. Enquiries will be kept.`)) return; try { await propertyApi.remove(item.id); showMessage("success", "Property deleted."); load(); } catch (e) { showMessage("error", e.message); } }
async function changeAvailable(item) { if (!confirmAction(`Mark “${item.title}” available again? Buyer and sale details will be cleared.`)) return; try { await propertyApi.status(item.id, { status: "available" }); showMessage("success", "Property marked available."); load(); } catch (e) { showMessage("error", e.message); } }
function soldDialog(item) {
  const dialog = el("dialog"); const form = el("form", { method: "dialog", class: "stack" }); form.append(el("h2", { text: `Record sale · ${item.title}` }));
  const fields = [["Buyer name", "buyer_name", "text", true], ["Phone", "buyer_phone", "tel", true], ["WhatsApp number", "buyer_whatsapp_number", "tel", true], ["Email (optional)", "buyer_email", "email", false], ["Sold date", "sold_at", "date", false], ["Sale price (optional)", "sale_price", "number", false]];
  for (const [label, name, type, required] of fields) { const wrap = el("div", { class: "field" }); wrap.append(el("label", { text: label })); const input = el("input", { name, type, required: required ? "required" : null, min: type === "number" ? "0" : null }); if (name === "sold_at") input.value = new Date().toISOString().slice(0, 10); wrap.append(input); form.append(wrap); }
  const actions = el("div", { class: "dialog-actions" }); const cancel = button("Cancel", () => dialog.close(), "button-light"); cancel.addEventListener("click", () => dialog.close()); const save = el("button", { type: "submit", class: "button button-primary", text: "Save sale" }); actions.append(cancel, save); form.append(actions); dialog.append(form); document.body.append(dialog);
  form.addEventListener("submit", async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); values.status = "sold"; if (values.sold_at) values.sold_at += "T12:00:00"; if (values.sale_price === "") delete values.sale_price; if (values.buyer_email === "") delete values.buyer_email; save.disabled = true; try { await propertyApi.status(item.id, values); dialog.close(); showMessage("success", "Sale recorded."); load(); } catch (e) { showMessage("error", e.message); save.disabled = false; } });
  dialog.addEventListener("close", () => dialog.remove(), { once: true }); dialog.showModal();
}
for (const input of [status, type, min, max, sort]) input.addEventListener("change", () => { page = 1; load(); });
let searchTimer; search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page = 1; load(); }, 250); });
load();
