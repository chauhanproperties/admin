import { requireLogin } from "../auth.js";
import { propertyApi, uploadImages } from "../api.js?v=2";
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGES_PER_PROPERTY } from "../config.js";
import { setupPage, showMessage, button, confirmAction } from "../ui.js";
import { el, money, pageParams } from "../utils.js";

if (!requireLogin()) throw new Error("Login required");
const id = pageParams().get("id");
const content = setupPage("properties", id ? "Edit property" : "Add property");
const heading = el("div", { class: "page-heading" }, [el("div", {}, [el("h2", { text: id ? "Edit listing" : "Create listing" }), el("p", { text: "Enter the property details. Measurements are stored in feet and square feet." })]), el("a", { href: "properties.html", class: "button button-light", text: "Back to properties" })]); content.append(heading);
const form = el("form", { class: "stack" }); content.append(form);
let dirty = false, savedId = id ? Number(id) : null, existingImages = [], pendingFiles = [], originalProperty = null;
function localDateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function saleValues(values) {
  return {
    status: values.get("status"),
    buyer_name: values.get("buyer_name").trim(),
    buyer_phone: values.get("buyer_phone").trim(),
    buyer_whatsapp_number: values.get("buyer_whatsapp_number").trim(),
    buyer_email: values.get("buyer_email").trim() || null,
    sold_at: values.get("sold_at") || null,
    sale_price: values.get("sale_price") === "" ? null : Number(values.get("sale_price")),
  };
}
function field(label, name, type = "text", options = {}) {
  const wrap = el("div", { class: `field ${options.span ? "span-2" : ""}` });
  wrap.append(el("label", { for: name, text: label }));
  let input;
  if (options.select) { input = el("select", { id: name, name }); options.select.forEach(([value, text]) => input.append(el("option", { value, text }))); }
  else if (type === "textarea") input = el("textarea", { id: name, name, maxlength: options.maxlength || "10000", rows: options.rows || "3" });
  else input = el("input", { id: name, name, type, required: options.required ? "required" : null, min: options.min, max: options.max, step: options.step || (type === "number" ? "any" : null), maxlength: options.maxlength });
  if (options.readonly) input.readOnly = true;
  if (options.value != null) input.value = options.value;
  wrap.append(input);
  return { wrap, input };
}
function section(title) { const box = el("section", { class: "card section" }); box.append(el("div", { class: "section-title", text: title })); return box; }
const basics = section("A · Basic details"); const basicGrid = el("div", { class: "form-grid" });
const title = field("Listing title *", "title", "text", { required: true, maxlength: 240 });
const type = field("Property type *", "property_type", "select", { required: true, select: [["plot", "Plot"], ["house", "House"], ["flat", "Flat"]] });
const address = field("Address *", "address", "textarea", { required: true, span: true, maxlength: 1000 });
const length = field("Length (ft) *", "length", "number", { required: true, min: "0.01" });
const width = field("Width (ft) *", "width", "number", { required: true, min: "0.01" });
const area = field("Area (sq ft) · calculated", "area", "number", { readonly: true });
const price = field("Price (₹) *", "price", "number", { required: true, min: "0" });
const description = field("Description", "description", "textarea", { span: true, maxlength: 10000 });
for (const x of [title, type, address, length, width, area, price, description]) basicGrid.append(x.wrap);
basics.append(basicGrid); form.append(basics);
const map = section("B · Map position (optional)"); const mapGrid = el("div", { class: "form-grid" });
const lat = field("Latitude", "latitude", "number", { min: "-90", max: "90" }); const lng = field("Longitude", "longitude", "number", { min: "-180", max: "180" }); const maps = field("Google Maps URL", "maps_url", "url", { span: true, maxlength: 2000 });
mapGrid.append(lat.wrap, lng.wrap, maps.wrap); map.append(mapGrid, el("p", { class: "muted", text: "On Google Maps, right-click the spot and copy the coordinates." })); form.append(map);
const building = section("C · House / flat details"); const buildGrid = el("div", { class: "form-grid" });
const bedrooms = field("Bedrooms *", "bedrooms", "number", { required: true, min: "0", step: "1" }); const kitchens = field("Kitchens *", "kitchens", "number", { required: true, min: "0", step: "1" }); const bathrooms = field("Bathrooms *", "bathrooms", "number", { required: true, min: "0", step: "1" }); const buildingArea = field("Building area (sq ft) *", "building_area", "number", { required: true, min: "0" }); const garden = field("Garden area (sq ft)", "garden_area", "number", { min: "0", value: 0 }); const parking = field("Parking area (sq ft)", "parking_area", "number", { min: "0", value: 0 }); const totalArea = field("Total area (sq ft) · calculated", "total_area", "number", { readonly: true });
for (const x of [bedrooms, kitchens, bathrooms, buildingArea, garden, parking, totalArea]) buildGrid.append(x.wrap); building.append(buildGrid); form.append(building);
const sold = section("D · Sale details (optional until marked sold)"); const soldGrid = el("div", { class: "form-grid" });
const status = field("Listing status", "status", "select", { select: [["available", "Available"], ["sold", "Sold"]] });
const buyerName = field("Buyer name", "buyer_name", "text"); const buyerPhone = field("Buyer phone", "buyer_phone", "tel"); const buyerWhatsapp = field("Buyer WhatsApp", "buyer_whatsapp_number", "tel"); const buyerEmail = field("Buyer email", "buyer_email", "email"); const soldDate = field("Sold date", "sold_at", "date"); const salePrice = field("Sale price (₹)", "sale_price", "number", { min: "0" });
for (const x of [status, buyerName, buyerPhone, buyerWhatsapp, buyerEmail, soldDate, salePrice]) soldGrid.append(x.wrap); sold.append(soldGrid); form.append(sold);
const photos = section("E · Images"); photos.append(el("p", { class: "muted", text: `JPG, PNG or WebP · up to ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB each · maximum ${MAX_IMAGES_PER_PROPERTY} per property.` }));
const fileWrap = el("div", { class: "field" }); fileWrap.append(el("label", { for: "images", text: "Choose property images" })); const files = el("input", { id: "images", type: "file", accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp", multiple: "multiple" }); fileWrap.append(files); photos.append(fileWrap);
const imageHost = el("div", { class: "image-list" }); photos.append(imageHost); const progress = el("p", { class: "muted" }); photos.append(progress); form.append(photos);
const actions = el("div", { class: "actions" }); const save = el("button", { type: "submit", class: "button button-primary", text: "Save property" }); const cancel = el("a", { href: "properties.html", class: "button button-light", text: "Cancel" }); const retry = button("Retry image upload", doUpload, "button-light"); retry.hidden = true; actions.append(save, cancel, retry); form.append(actions);

function buildingVisibility() { const has = ["house", "flat"].includes(type.input.value); building.hidden = !has; for (const item of [bedrooms, kitchens, bathrooms, buildingArea]) item.input.required = has; }
function statusVisibility() { const isSold = status.input.value === "sold"; for (const item of [buyerName, buyerPhone, buyerWhatsapp]) item.input.required = isSold; for (const item of [buyerName, buyerPhone, buyerWhatsapp, buyerEmail, soldDate, salePrice]) item.wrap.hidden = !isSold; }
function calc() { area.input.value = length.input.value && width.input.value ? (Number(length.input.value) * Number(width.input.value)).toFixed(2) : ""; totalArea.input.value = (Number(buildingArea.input.value || 0) + Number(garden.input.value || 0) + Number(parking.input.value || 0)).toFixed(2); }
function renderImages() {
  imageHost.replaceChildren();
  existingImages.forEach((image, index) => {
    const card = el("div", { class: "image-card" }); card.append(el("img", { src: image.image_url, alt: "Property image" }));
    const row = el("div", { class: "actions" }); if (index === 0) row.append(el("span", { class: "badge available", text: "Main" }));
    row.append(button("↑", () => moveImage(index, -1), "button-light button-small"), button("↓", () => moveImage(index, 1), "button-light button-small"), button("Delete", async () => { if (!confirmAction("Delete this image from the property and Cloudinary?")) return; try { await propertyApi.deleteImage(savedId, image.id); existingImages.splice(index, 1); renderImages(); } catch (e) { showMessage("error", e.message); } }, "button-danger button-small")); card.append(row); imageHost.append(card);
  });
  pendingFiles.forEach(file => { const card = el("div", { class: "image-card" }); const preview = el("img", { alt: file.name }); preview.src = URL.createObjectURL(file); card.append(preview, el("p", { text: file.name })); imageHost.append(card); });
}
async function moveImage(index, delta) { const next = index + delta; if (next < 0 || next >= existingImages.length) return; [existingImages[index], existingImages[next]] = [existingImages[next], existingImages[index]]; try { await propertyApi.orderImages(savedId, existingImages.map(x => x.id)); renderImages(); } catch (e) { showMessage("error", e.message); } }
files.addEventListener("change", () => {
  const chosen = Array.from(files.files || []); const valid = chosen.filter(file => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= MAX_IMAGE_SIZE_BYTES);
  if (valid.length !== chosen.length) showMessage("error", "Some files were skipped. Choose JPG, PNG or WebP images under the size limit.");
  pendingFiles = valid.slice(0, Math.max(0, MAX_IMAGES_PER_PROPERTY - existingImages.length));
  if (pendingFiles.length < valid.length) showMessage("error", `A property can have at most ${MAX_IMAGES_PER_PROPERTY} images.`);
  renderImages(); dirty = true;
});
async function doUpload() {
  if (!pendingFiles.length || !savedId) return;
  retry.disabled = true;
  try { await uploadImages(savedId, pendingFiles, percent => { progress.textContent = `Uploading images… ${percent}%`; }); pendingFiles = []; files.value = ""; existingImages = await propertyApi.images(savedId); renderImages(); progress.textContent = "Images uploaded."; retry.hidden = true; showMessage("success", "Property images uploaded."); }
  catch (error) { progress.textContent = "Image upload failed. The property has been saved; retry when ready."; retry.hidden = false; showMessage("error", error.message); }
  finally { retry.disabled = false; }
}

type.input.addEventListener("change", () => { buildingVisibility(); dirty = true; }); status.input.addEventListener("change", () => { statusVisibility(); dirty = true; });
for (const item of [length, width, buildingArea, garden, parking]) item.input.addEventListener("input", calc);
form.addEventListener("input", () => { dirty = true; });
cancel.addEventListener("click", event => { if (dirty && !confirmAction("Discard unsaved changes?")) event.preventDefault(); });

if (id) {
  try {
    const item = await propertyApi.get(id);
    title.input.value = item.title; type.input.value = item.property_type; address.input.value = item.address; length.input.value = item.length; width.input.value = item.width; price.input.value = item.price; description.input.value = item.description || ""; lat.input.value = item.latitude ?? ""; lng.input.value = item.longitude ?? ""; maps.input.value = item.maps_url || "";
    status.input.value = item.status; buyerName.input.value = item.buyer_name || ""; buyerPhone.input.value = item.buyer_phone || ""; buyerWhatsapp.input.value = item.buyer_whatsapp_number || ""; buyerEmail.input.value = item.buyer_email || ""; salePrice.input.value = item.sale_price ?? ""; soldDate.input.value = localDateValue(item.sold_at);
    originalProperty = { property_type: item.property_type, sale: { status: item.status, buyer_name: item.buyer_name || "", buyer_phone: item.buyer_phone || "", buyer_whatsapp_number: item.buyer_whatsapp_number || "", buyer_email: item.buyer_email || null, sold_at: localDateValue(item.sold_at) || null, sale_price: item.sale_price == null ? null : Number(item.sale_price) } };
    if (item.building_details) for (const [key, control] of Object.entries({ bedrooms, kitchens, bathrooms, building_area: buildingArea, garden_area: garden, parking_area: parking })) control.input.value = item.building_details[key] ?? 0;
    existingImages = item.images || []; buildingVisibility(); statusVisibility(); calc(); renderImages(); dirty = false;
  } catch (error) { showMessage("error", error.message); }
}

form.addEventListener("submit", async event => {
  event.preventDefault(); if (!form.reportValidity()) return;
  const values = new FormData(form);
  const payload = { title: values.get("title").trim(), property_type: values.get("property_type"), address: values.get("address").trim(), length: Number(values.get("length")), width: Number(values.get("width")), price: Number(values.get("price")), description: values.get("description") || null, latitude: values.get("latitude") ? Number(values.get("latitude")) : null, longitude: values.get("longitude") ? Number(values.get("longitude")) : null, maps_url: values.get("maps_url") || null, building_details: null };
  if (id && originalProperty && ["house", "flat"].includes(originalProperty.property_type) && payload.property_type === "plot" && !confirmAction("Building details will be deleted.")) return;
  if (["house", "flat"].includes(payload.property_type)) payload.building_details = { bedrooms: Number(values.get("bedrooms")), kitchens: Number(values.get("kitchens")), bathrooms: Number(values.get("bathrooms")), building_area: Number(values.get("building_area")), garden_area: Number(values.get("garden_area") || 0), parking_area: Number(values.get("parking_area") || 0) };
  if (pendingFiles.length + existingImages.length > MAX_IMAGES_PER_PROPERTY) { showMessage("error", `A property can have at most ${MAX_IMAGES_PER_PROPERTY} images.`); return; }
  save.disabled = true;
  try {
    const result = savedId ? await propertyApi.update(savedId, payload) : await propertyApi.create(payload); savedId = result.id;
    const currentSale = saleValues(values);
    const previousSale = originalProperty?.sale || { status: "available", buyer_name: "", buyer_phone: "", buyer_whatsapp_number: "", buyer_email: null, sold_at: null, sale_price: null };
    const saleChanged = JSON.stringify(currentSale) !== JSON.stringify(previousSale);
    if (currentSale.status === "sold" && saleChanged) {
      const sale = { ...currentSale, sold_at: currentSale.sold_at ? new Date(`${currentSale.sold_at}T12:00:00`).toISOString() : null };
      await propertyApi.status(savedId, sale);
    } else if (currentSale.status === "available" && saleChanged) {
      await propertyApi.status(savedId, { status: "available" });
    }
    originalProperty = { property_type: payload.property_type, sale: currentSale };
    dirty = false;
    if (pendingFiles.length) await doUpload();
    if (!pendingFiles.length) { showMessage("success", "Property saved."); if (!id) setTimeout(() => { window.location.href = "properties.html"; }, 700); }
  } catch (error) { showMessage("error", error.message); }
  finally { save.disabled = false; }
});
buildingVisibility(); statusVisibility(); calc();
