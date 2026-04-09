const http = require("http");
const https = require("https");
const { URL } = require("url");
const zlib = require("zlib");

/**
 * Normalize and validate incoming URL
 */
function normalizeTargetUrl(input) {
  if (!input || typeof input !== "string") return null;
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
      return null;
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

/**
 * HTTP(S) GET с поддержкой редиректов
 */
function httpGetBuffer(url, redirectsLeft = 5, headers = {}) {
  return new Promise((resolve, reject) => {
    console.log(
      `[httpGetBuffer] Запрос к: ${url} (осталось редиректов: ${redirectsLeft})`,
    );
    const client = url.startsWith("https:") ? https : http;
    const defaultHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
    };
    const req = client.get(
      url,
      { headers: { ...defaultHeaders, ...headers } },
      (res) => {
        const status = res.statusCode || 0;
        const loc = res.headers.location;
        const contentType = res.headers["content-type"] || "unknown";
        const contentEncoding = res.headers["content-encoding"] || "none";

        console.log(
          `[httpGetBuffer] Ответ: статус ${status}, Content-Type: ${contentType}, Content-Encoding: ${contentEncoding}`,
        );

        if (
          [301, 302, 303, 307, 308].includes(status) &&
          loc &&
          redirectsLeft > 0
        ) {
          const next = new URL(loc, url).toString();
          console.log(`[httpGetBuffer] Редирект на: ${next}`);
          res.resume();
          httpGetBuffer(next, redirectsLeft - 1, headers)
            .then(resolve)
            .catch(reject);
          return;
        }
        if (status >= 400) {
          console.error(`[httpGetBuffer] Ошибка HTTP ${status}`);
          reject(new Error(`Request failed with status ${status}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          console.log(
            `[httpGetBuffer] Получено данных: ${buffer.length} байт (сжато: ${contentEncoding})`,
          );

          const encoding = String(
            res.headers["content-encoding"] || "",
          ).toLowerCase();
          if (encoding.includes("br")) {
            console.log(`[httpGetBuffer] Декомпрессия Brotli...`);
            zlib.brotliDecompress(buffer, (err, out) => {
              if (err) {
                console.log(
                  `[httpGetBuffer] Ошибка декомпрессии Brotli, используем сырой буфер: ${err.message}`,
                );
                return resolve(buffer);
              }
              console.log(
                `[httpGetBuffer] Декомпрессия Brotli успешна: ${out.length} байт`,
              );
              resolve(out);
            });
          } else if (encoding.includes("gzip")) {
            console.log(`[httpGetBuffer] Декомпрессия Gzip...`);
            zlib.gunzip(buffer, (err, out) => {
              if (err) {
                console.log(
                  `[httpGetBuffer] Ошибка декомпрессии Gzip, используем сырой буфер: ${err.message}`,
                );
                return resolve(buffer);
              }
              console.log(
                `[httpGetBuffer] Декомпрессия Gzip успешна: ${out.length} байт`,
              );
              resolve(out);
            });
          } else if (encoding.includes("deflate")) {
            console.log(`[httpGetBuffer] Декомпрессия Deflate...`);
            zlib.inflate(buffer, (err, out) => {
              if (err) {
                console.log(
                  `[httpGetBuffer] Ошибка декомпрессии Deflate, используем сырой буфер: ${err.message}`,
                );
                return resolve(buffer);
              }
              console.log(
                `[httpGetBuffer] Декомпрессия Deflate успешна: ${out.length} байт`,
              );
              resolve(out);
            });
          } else {
            console.log(
              `[httpGetBuffer] Сжатие не используется, возвращаем сырой буфер`,
            );
            resolve(buffer);
          }
        });
      },
    );
    req.on("error", (err) => {
      console.error(`[httpGetBuffer] Ошибка запроса: ${err.message}`);
      reject(err);
    });
    req.setTimeout(10000, () => {
      console.error(`[httpGetBuffer] Таймаут запроса`);
      req.destroy(new Error("Request timeout"));
    });
  });
}

/**
 * Декодировать HTML-сущности в строке (минимально необходимый набор)
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== "string") return text;
  const named = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
  };
  let decoded = text.replace(
    /&(amp|lt|gt|quot);|&#(?:39|x27);/g,
    (fullMatch) => named[fullMatch] || fullMatch,
  );
  decoded = decoded.replace(/&#(\d+);/g, (fullMatch, decimalDigits) => {
    const code = parseInt(decimalDigits, 10);
    return Number.isFinite(code) ? String.fromCharCode(code) : fullMatch;
  });
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (fullMatch, hexDigits) => {
    const code = parseInt(hexDigits, 16);
    return Number.isFinite(code) ? String.fromCharCode(code) : fullMatch;
  });
  return decoded;
}

/**
 * Извлечь content из meta-тега по имени/свойству (без зависимостей)
 */
function findMetaContent(html, attr, value) {
  console.log(`[findMetaContent] Ищем мета-тег: ${attr}="${value}"`);
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+${attr}\\s*=\\s*["']${escapedValue}["'][^>]*>`,
    "i",
  );
  const tagMatch = html.match(pattern);
  if (!tagMatch) {
    console.log(`[findMetaContent] Мета-тег не найден для ${attr}="${value}"`);
    return null;
  }
  console.log(
    `[findMetaContent] Найден тег: ${tagMatch[0].substring(0, 100)}...`,
  );
  const contentMatch = tagMatch[0].match(/content\s*=\s*["']([^"']+)["']/i);
  if (!contentMatch) {
    console.log(`[findMetaContent] Атрибут content не найден в теге`);
    return null;
  }
  const rawContent = contentMatch[1];
  console.log(`[findMetaContent] Сырое значение content: ${rawContent}`);
  const decoded = decodeHtmlEntities(rawContent);
  console.log(`[findMetaContent] Декодированное значение: ${decoded}`);
  return decoded;
}

/**
 * Попробовать извлечь URL изображения из OG/Twitter мета-тегов
 */
function extractOgImageUrl(html, baseUrl) {
  console.log(
    `[extractOgImageUrl] Начинаем поиск OG-изображения для базового URL: ${baseUrl}`,
  );
  console.log(`[extractOgImageUrl] Размер HTML: ${html.length} символов`);

  const hasOgImage = /<meta[^>]+property\s*=\s*["']og:image["'][^>]*>/i.test(
    html,
  );
  console.log(`[extractOgImageUrl] HTML содержит og:image тег: ${hasOgImage}`);

  const candidates = [
    ["property", "og:image:secure_url"],
    ["property", "og:image:url"],
    ["property", "og:image"],
    ["name", "og:image"],
    ["name", "twitter:image:src"],
    ["property", "twitter:image:src"],
    ["name", "twitter:image"],
    ["property", "twitter:image"],
  ];
  for (const [attr, value] of candidates) {
    const content = findMetaContent(html, attr, value);
    if (content) {
      console.log(
        `[extractOgImageUrl] Найдено значение для ${attr}="${value}": ${content}`,
      );
      const resolved = resolveToAbsoluteUrl(content, baseUrl);
      if (resolved) {
        console.log(`[extractOgImageUrl] Разрешенный URL: ${resolved}`);
        return resolved;
      } else {
        console.log(
          `[extractOgImageUrl] Не удалось разрешить URL для ${content}`,
        );
      }
    }
  }
  console.log(
    `[extractOgImageUrl] OG-изображение не найдено ни в одном из кандидатов`,
  );
  return null;
}

/**
 * Разрешить относительные/протокол-независимые URL
 */
function resolveToAbsoluteUrl(resource, baseUrl) {
  if (!resource) return null;
  try {
    if (resource.startsWith("//")) {
      const base = new URL(baseUrl);
      return `${base.protocol}${resource}`;
    }
    return new URL(resource, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Получить URL OG-изображения страницы (или вернуть fallback)
 */
async function resolveOpenGraphImage(pageUrl) {
  console.log(
    `\n[resolveOpenGraphImage] ========== НАЧАЛО ОБРАБОТКИ ==========`,
  );
  console.log(`[resolveOpenGraphImage] Запрашиваем URL: ${pageUrl}`);

  try {
    console.log(`[resolveOpenGraphImage] Загружаем HTML...`);
    const htmlBuffer = await httpGetBuffer(pageUrl);
    console.log(
      `[resolveOpenGraphImage] HTML загружен, размер: ${htmlBuffer.length} байт`,
    );

    const html = htmlBuffer.toString("utf8");
    console.log(
      `[resolveOpenGraphImage] HTML преобразован в строку, длина: ${html.length} символов`,
    );

    console.log(
      `[resolveOpenGraphImage] Первые 500 символов HTML:\n${html.substring(0, 500)}`,
    );

    console.log(`[resolveOpenGraphImage] Ищем OG-изображение...`);
    const img = extractOgImageUrl(html, pageUrl);

    if (img) {
      console.log(
        `[resolveOpenGraphImage] ✅ УСПЕХ: Найдено OG-изображение: ${img}`,
      );
      return img;
    }

    console.log(
      `[resolveOpenGraphImage] OG-изображение не найдено, пробуем fallback для Raycast...`,
    );
    try {
      const parsedPageUrl = new URL(pageUrl);
      if (parsedPageUrl.hostname.endsWith("raycast.com")) {
        const parts = parsedPageUrl.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          const handle = parts[0];
          const name = parts[1];
          const fallbackUrl = `https://www.raycast.com/api/extension-og?handle=${encodeURIComponent(handle)}&name=${encodeURIComponent(name)}`;
          console.log(
            `[resolveOpenGraphImage] Используем Raycast fallback: ${fallbackUrl}`,
          );
          return fallbackUrl;
        }
      }
    } catch (error) {
      console.log(
        `[resolveOpenGraphImage] Ошибка при создании Raycast fallback: ${error.message}`,
      );
    }

    const finalFallback = `https://v1.opengraph.11ty.dev/${encodeURIComponent(pageUrl)}/`;
    console.log(
      `[resolveOpenGraphImage] Используем универсальный fallback: ${finalFallback}`,
    );
    return finalFallback;
  } catch (error) {
    console.error(`[resolveOpenGraphImage] ❌ ОШИБКА: ${error.message}`);
    console.error(`[resolveOpenGraphImage] Stack: ${error.stack}`);
    throw error;
  } finally {
    console.log(
      `[resolveOpenGraphImage] ========== КОНЕЦ ОБРАБОТКИ ==========\n`,
    );
  }
}

module.exports = {
  normalizeTargetUrl,
  httpGetBuffer,
  resolveOpenGraphImage,
};
