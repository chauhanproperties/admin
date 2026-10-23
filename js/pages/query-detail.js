import { requireLogin } from "../auth.js";
import { queryApi } from "../api.js";
import { setupPage, showMessage, showLoading, button, badge, confirmAction } from "../ui.js";
import { el, dateTime, timeAgo, money, pageParams } from "../utils.js";

if (!requireLogin()) throw new Error("Login required");
const id = pageParams().get("id"); const content = setupPage("queries", "Query details");
content.append(el("div", { class: "page-heading" }, [el("div", {}, [el("h2", { text: "Enquiry details" }), el("p", { text: `Query #${id || ""}` })]), el("a", { href: "queries.html", class: "button button-light", text: "Back to queries" })]));
const host = el("div", { class: "stack" }); content.append(host); showLoading(host);
try {
  const item = await queryApi.get(id); host.replaceChildren();
  const summary = el("section", { class: "card" }); summary.append(el("div", { class: "card-head" }, [el("h2", { text: "Customer message" }), badge(item.status)]));
  summary.append(el("p", { text: item.message || "No message was provided." }), el("p", { class: "muted", text: `Received ${dateTime(item.raised_at)} · ${timeAgo(item.raised_at)}` }));
  if (item.resolved_at) summary.append(el("p", { class: "muted", text: `Resolved ${dateTime(item.resolved_at)}` }));
  const controls = el("div", { class: "actions" });
  controls.append(item.status === "new" ? button("Mark resolved", async () => { if (!confirmAction("Mark this query resolved?")) return; try { await queryApi.resolve(id); showMessage("success", "Query resolved."); location.reload(); } catch (e) { showMessage("error", e.message); } }, "button-primary") : button("Reopen query", async () => { if (!confirmAction("Reopen this query?")) return; try { await queryApi.reopen(id); showMessage("success", "Query reopened."); location.reload(); } catch (e) { showMessage("error", e.message); } })); summary.append(controls); host.append(summary);
  const customer = item.customer; const cCard = el("section", { class: "card" }); cCard.append(el("h2", { text: "Customer" }));
  const details = el("div", { class: "detail-grid" }); for (const [label, value] of [["Name", customer?.name], ["Phone", customer?.phone], ["WhatsApp", customer?.whatsapp_number], ["Email", customer?.email || "No email on file"], ["Other queries", Math.max(0, (customer?.query_count || 1) - 1)]]) details.append(el("div", { class: "detail-item" }, [el("strong", { text: label }), el("span", { text: value ?? "—" })]));
  cCard.append(details); if (customer) cCard.append(el("a", { href: `customer-detail.html?id=${customer.id}`, class: "button button-light", text: "Open customer" })); host.append(cCard);
  const property = item.property; const pCard = el("section", { class: "card" }); pCard.append(el("h2", { text: "Property" }));
  if (property) { pCard.append(el("div", { class: "detail-grid" }, [
    el("div", { class: "detail-item" }, [el("strong", { text: "Listing" }), el("span", { text: property.title })]),
    el("div", { class: "detail-item" }, [el("strong", { text: "Type" }), el("span", { text: property.property_type })]),
    el("div", { class: "detail-item" }, [el("strong", { text: "Price" }), el("span", { text: money(property.price) })]),
    el("div", { class: "detail-item" }, [el("strong", { text: "Status" }), badge(property.status)]),
  ]), el("a", { href: `property-form.html?id=${property.id}`, class: "button button-light", text: "Edit property" })); } else pCard.append(el("p", { class: "muted", text: "General query" })); host.append(pCard);
  const actions = el("section", { class: "grid grid-2" });
  const wa = el("div", { class: "card stack" }); wa.append(el("h2", { text: "Reply by WhatsApp" })); const waText = el("textarea", { rows: "4" }); waText.value = `Hello ${customer?.name || ""}, thank you for your interest${property ? ` in ${property.title}` : ""}. How can I help?`; wa.append(waText); wa.append(button("Open WhatsApp", async () => { const tab = window.open("about:blank", "_blank"); if (tab) tab.opener = null; try { const result = await queryApi.whatsapp(id, waText.value); if (tab) tab.location.href = result.url; else window.location.href = result.url; } catch (e) { tab?.close(); showMessage("error", e.message); } }, "button-primary"));
  const email = el("form", { class: "card stack" }); email.append(el("h2", { text: "Reply by email" })); const subject = el("input", { required: "required", maxlength: "200", placeholder: "Subject" }); subject.value = `Re: your property enquiry`; const body = el("textarea", { required: "required", maxlength: "10000", rows: "5", placeholder: "Write your reply" }); email.append(el("div", { class: "field" }, [el("label", { text: "Subject" }), subject]), el("div", { class: "field" }, [el("label", { text: "Message" }), body])); const send = el("button", { type: "submit", class: "button button-primary", text: "Send email" }); if (!customer?.email) { send.disabled = true; email.append(el("p", { class: "muted", text: "No email address on file." })); } email.append(send); email.addEventListener("submit", async event => { event.preventDefault(); send.disabled = true; try { await queryApi.replyEmail(id, subject.value, body.value); showMessage("success", "Email sent. The query remains in its current status."); body.value = ""; } catch (e) { showMessage("error", e.message); } finally { send.disabled = !customer?.email; } }); actions.append(wa, email); host.append(actions);
} catch (error) { host.replaceChildren(el("div", { class: "empty-state", text: "Could not load this query." })); showMessage("error", error.message); }
