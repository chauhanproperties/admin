const PRODUCTION_API_URL = "https://REPLACE-WITH-YOUR-API.example.com";
const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
export const API_BASE_URL = isLocalHost ? "http://localhost:5000" : PRODUCTION_API_URL;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PROPERTY = 10;
