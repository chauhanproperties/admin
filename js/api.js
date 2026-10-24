import { API_BASE_URL } from "./config.js";
import { getToken, logout } from "./auth.js";

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

function readableError(detail, fallback) {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map(item => {
      const message = typeof item === "string" ? item : item?.msg || item?.message;
      if (typeof message !== "string" || !message.trim()) return null;
      const location = Array.isArray(item?.loc) ? item.loc.filter(part => part !== "body").join(" ") : "";
      return location ? `Please check ${location}: ${message}` : message;
    }).filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  if (detail && typeof detail === "object" && typeof detail.message === "string") return detail.message;
  return fallback;
}

export async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  const waking = setTimeout(() => window.dispatchEvent(new CustomEvent("api:waking")), 5000);
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (response.status === 401 && !path.startsWith("/api/admin/auth/")) logout();
    if (!response.ok) throw new ApiError(readableError(payload?.detail, "The request could not be completed."), response.status);
    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw new ApiError("The server took too long to respond. Please try again.", 0);
    if (error instanceof TypeError) throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
    throw error;
  } finally { clearTimeout(timer); clearTimeout(waking); }
}

export const authApi = {
  login: (email, password) => api("/api/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
};
export const propertyApi = {
  list: params => api(`/api/admin/properties?${new URLSearchParams(params)}`),
  get: id => api(`/api/admin/properties/${id}`),
  create: data => api("/api/admin/properties", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => api(`/api/admin/properties/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: id => api(`/api/admin/properties/${id}`, { method: "DELETE" }),
  status: (id, data) => api(`/api/admin/properties/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
  images: id => api(`/api/admin/properties/${id}/images`),
  deleteImage: (id, imageId) => api(`/api/admin/properties/${id}/images/${imageId}`, { method: "DELETE" }),
  orderImages: (id, image_ids) => api(`/api/admin/properties/${id}/images/order`, { method: "PUT", body: JSON.stringify({ image_ids }) }),
};
export function uploadImages(id, files, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/admin/properties/${id}/images`);
    xhr.timeout = 120000;
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => {
      const body = (() => { try { return JSON.parse(xhr.responseText); } catch { return null; } })();
      if (xhr.status === 401) logout();
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new ApiError(readableError(body?.detail, "Image upload failed."), xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Could not reach the server during image upload.", 0));
    xhr.ontimeout = () => reject(new ApiError("Image upload timed out after two minutes. Please try again.", 0));
    const data = new FormData();
    for (const file of files) data.append("files", file);
    xhr.send(data);
  });
}
export const queryApi = {
  list: params => api(`/api/admin/queries?${new URLSearchParams(params)}`),
  get: id => api(`/api/admin/queries/${id}`),
  stats: () => api("/api/admin/queries/stats"),
  resolve: id => api(`/api/admin/queries/${id}/resolve`, { method: "PATCH" }),
  reopen: id => api(`/api/admin/queries/${id}/reopen`, { method: "PATCH" }),
  whatsapp: (id, message) => api(`/api/admin/queries/${id}/whatsapp-link?${new URLSearchParams({ message })}`),
  replyEmail: (id, subject, body) => api(`/api/admin/queries/${id}/reply-email`, { method: "POST", body: JSON.stringify({ subject, body }) }),
};
export const customerApi = {
  list: params => api(`/api/admin/customers?${new URLSearchParams(params)}`),
  get: id => api(`/api/admin/customers/${id}`),
  update: (id, data) => api(`/api/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};
export const dashboardApi = () => api("/api/admin/dashboard");
