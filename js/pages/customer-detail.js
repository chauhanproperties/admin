import { requireLogin } from "../auth.js";
import { customerApi } from "../api.js?v=2";
import { setupPage, showMessage, showLoading, emptyState } from "../ui.js";
import { el, dateTime, money, pageParams } from "../utils.js";

if (!requireLogin()) throw new Error("Login required");
const id = pageParams().get("id"); const content = setupPage("customers", "Customer details");
content.append(el("div", { class: "page-heading" }, [el("div", {}, [el("h2", { text: "Customer profile" }), el("p", { text: `Customer #${id || ""}` })]), el("a", { href: "customers.html", class: "button button-light", text: "Back to customers" })]));
const host = el("div", { class: "stack" }); content.append(host); showLoading(host);
try {
  const customer = await customerApi.get(id); host.replaceChildren();
  const profile = el("section", { class: "card" }); profile.append(el("h2", { text: customer.name }));
  const details = el("div", { class: "detail-grid" });
  for (const [label, value] of [["Phone", customer.phone], ["WhatsApp", customer.whatsapp_number], ["Registered", dateTime(customer.registered_at)]]) details.append(el("div", { class: "detail-item" }, [el("strong", { text: label }), el("span", { text: value || "—" })]));
  const form = el("form", { class: "form-grid customer-edit-form" });
  const email = el("input", { type: "email", maxlength: "320", value: customer.email || "" }); const age = el("input", { type: "number", min: "0", max: "120", value: customer.age ?? "" });
  const gender = el("select"); [["", "Not set"], ["female", "Female"], ["male", "Male"], ["other", "Other"]].forEach(([v, label]) => gender.append(el("option", { value: v, text: label, selected: v === (customer.gender || "") ? "selected" : null })));
  for (const [label, input] of [["Email", email], ["Age", age], ["Gender", gender]]) form.append(el("div", { class: "field" }, [el("label", { text: label }), input]));
  const save = el("button", { type: "submit", class: "button button-primary", text: "Save optional details" }); form.append(save); form.addEventListener("submit", async event => { event.preventDefault(); save.disabled = true; try { await customerApi.update(id, { email: email.value || null, age: age.value ? Number(age.value) : null, gender: gender.value || null }); showMessage("success", "Customer details saved."); } catch (e) { showMessage("error", e.message); } finally { save.disabled = false; } });
  profile.append(details, form); host.append(profile);
  const queries = el("section", { class: "card" }); queries.append(el("h2", { text: "Enquiry history" }));
  if (!customer.queries.length) queries.append(emptyState("No enquiries yet."));
  else { const wrap = el("div", { class: "table-wrap" }), table = el("table"), body = el("tbody"); table.append(el("thead", {}, [el("tr", {}, ["Property", "Message", "Status", "Received", ""].map(x => el("th", { text: x }))]), body]); customer.queries.forEach(q => { const row = el("tr"); row.append(el("td", { text: q.property_title || "General query" }), el("td", { text: q.message || "—" }), el("td", { text: q.status }), el("td", { text: dateTime(q.raised_at) }), el("td", {}, [el("a", { href: `query-detail.html?id=${q.id}`, text: "Open" })])); body.append(row); }); wrap.append(table); queries.append(wrap); } host.append(queries);
  const purchases = el("section", { class: "card" }); purchases.append(el("h2", { text: "Properties purchased" }));
  if (!customer.purchases.length) purchases.append(emptyState("No purchases recorded."));
  else { const wrap = el("div", { class: "table-wrap" }), table = el("table"), body = el("tbody"); table.append(el("thead", {}, [el("tr", {}, ["Property", "Status", "Sold", "Sale price"].map(x => el("th", { text: x }))]), body]); customer.purchases.forEach(p => { const row = el("tr"); row.append(el("td", {}, [el("a", { href: `property-form.html?id=${p.id}`, text: p.title })]), el("td", { text: p.status }), el("td", { text: dateTime(p.sold_at) }), el("td", { text: money(p.sale_price) })); body.append(row); }); wrap.append(table); purchases.append(wrap); } host.append(purchases);
} catch (error) { host.replaceChildren(emptyState("Could not load this customer.")); showMessage("error", error.message); }
