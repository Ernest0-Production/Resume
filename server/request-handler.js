const fs = require("fs");
const path = require("path");
const TOML = require("@iarna/toml");
const { URL } = require("url");
const { PORT, HOST, PROJECT_ROOT } = require("./config");
const { getMimeType } = require("./mime");
const { serveStatic } = require("./static-serve");
const {
  localizeResumeData,
  hasMultilanguageFields,
} = require("../lib/resume-localize");
const { handleShortPdfLink, handlePdfRequest } = require("./pdf-handlers");
const { normalizeTargetUrl, resolveOpenGraphImage } = require("./og-resolve");

function createRequestListener() {
  return function requestListener(req, res) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    try {
      const parsed = new URL(req.url, `http://${HOST}:${PORT}`);
      if (parsed.pathname === "/api/og-image") {
        console.log(`\n[API] ========== ЗАПРОС /api/og-image ==========`);
        const targetParam = parsed.searchParams.get("url") || "";
        console.log(`[API] Получен параметр url: ${targetParam}`);
        const targetUrl = normalizeTargetUrl(targetParam);
        console.log(`[API] Нормализованный URL: ${targetUrl}`);

        if (!targetUrl) {
          console.error(`[API] ❌ Невалидный или отсутствующий URL параметр`);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Invalid or missing url parameter" }),
          );
          return;
        }

        resolveOpenGraphImage(targetUrl)
          .then((imageUrl) => {
            console.log(
              `[API] ✅ Успешно получен URL изображения: ${imageUrl}`,
            );
            console.log(`[API] Редирект на: ${imageUrl}`);
            res.writeHead(302, {
              Location: imageUrl,
              "Cache-Control": "public, max-age=3600",
            });
            res.end();
            console.log(`[API] ========== КОНЕЦ ЗАПРОСА ==========\n`);
          })
          .catch((error) => {
            console.error(
              `[API] ❌ Ошибка при получении OG изображения: ${error && error.message ? error.message : error}`,
            );
            console.error(
              `[API] Stack: ${error && error.stack ? error.stack : "N/A"}`,
            );
            const fallback = `https://v1.opengraph.11ty.dev/${encodeURIComponent(targetUrl)}/`;
            console.log(`[API] Используем fallback: ${fallback}`);
            res.writeHead(302, {
              Location: fallback,
              "Cache-Control": "public, max-age=300",
            });
            res.end();
            console.log(
              `[API] ========== КОНЕЦ ЗАПРОСА (fallback) ==========\n`,
            );
          });
        return;
      }
      if (parsed.pathname === "/api/resume") {
        if (req.method !== "GET") {
          res.writeHead(405, {
            "Content-Type": "application/json",
            Allow: "GET",
          });
          res.end(JSON.stringify({ error: "Method Not Allowed" }));
          return;
        }
        const lang = (parsed.searchParams.get("lang") || "ru").toLowerCase();
        const allowedLangs = new Set(["ru", "en"]);
        if (!allowedLangs.has(lang)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: 'Unsupported language. Use "ru" or "en".',
            }),
          );
          return;
        }
        const tomlPath = path.join(PROJECT_ROOT, "resume.toml");
        fs.readFile(tomlPath, "utf8", (err, text) => {
          if (err) {
            if (err.code === "ENOENT") {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "resume.toml not found" }));
              return;
            }
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Failed to read resume.toml" }));
            return;
          }
          try {
            const parsedToml = TOML.parse(text);
            const localized = localizeResumeData(parsedToml, lang);
            localized.hasMultilanguageFields =
              hasMultilanguageFields(parsedToml);
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            });
            res.end(JSON.stringify(localized));
          } catch (parseError) {
            console.error(
              "TOML parse error:",
              parseError && parseError.message
                ? parseError.message
                : parseError,
            );
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ error: "Invalid TOML format in resume.toml" }),
            );
          }
        });
        return;
      }
      if (parsed.pathname === "/api/pdf") {
        handlePdfRequest(req, res, parsed);
        return;
      }
      if (
        parsed.pathname === "/data/resume.ats.pdf" ||
        parsed.pathname === "/data/resume.hr.pdf"
      ) {
        handleShortPdfLink(req, res, parsed);
        return;
      }
    } catch (error) {
      // Ignore parsing errors and proceed to static handling
    }

    serveStatic(req, res, PROJECT_ROOT, getMimeType);
  };
}

module.exports = { createRequestListener };
