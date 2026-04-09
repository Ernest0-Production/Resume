/**
 * Encode filename for Content-Disposition header (RFC 5987)
 * Handles non-ASCII characters properly
 */
function encodeContentDispositionFilename(filename) {
  const hasNonAscii = /[^\x00-\x7F]/.test(filename);

  if (!hasNonAscii) {
    return `attachment; filename="${filename}"`;
  }

  const asciiFallback = filename.replace(/[^\x00-\x7F]/g, "_");
  const encoded = encodeURIComponent(filename);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

module.exports = { encodeContentDispositionFilename };
