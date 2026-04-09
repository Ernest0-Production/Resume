const path = require("path");
const { MIME_TYPES } = require("./config");

/**
 * Get MIME type for a file
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

module.exports = { getMimeType };
