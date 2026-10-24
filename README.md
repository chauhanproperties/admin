# Chauhan Properties admin panel

Plain HTML, CSS, and JavaScript admin panel. API calls are centralized in `js/api.js`; the local API URL and image limits are in `js/config.js`.

Serve from the parent project directory with:

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory admin
```

Then open `http://localhost:8000`. Run the API separately from `server` on port 5000. For login, enter the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server/.env`; the password is server-only and must be at least 16 characters. The token is stored in browser local storage and expires server-side after 12 hours.

Before deployment, replace the `PRODUCTION_API_URL` placeholder in `js/config.js` with the deployed API address, and replace the matching API host placeholder in `_headers`. Local hostnames continue to use port 5000. `_headers` applies security headers on Cloudflare Pages; it does not affect local serving.

The UI renders data as text nodes and does not insert customer-provided content as HTML.
