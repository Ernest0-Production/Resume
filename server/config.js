const path = require("path");

const PORT = process.env.PORT || 3000;
const HOST = "localhost";

/** Repository root (parent of this `server/` directory). */
const PROJECT_ROOT = path.join(__dirname, "..");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

module.exports = { PORT, HOST, PROJECT_ROOT, MIME_TYPES };
